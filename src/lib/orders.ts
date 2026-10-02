import "server-only";
import { z } from "zod";
import { Prisma, type Shop } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { randomToken } from "./crypto";
import { db } from "./db";
import { MIN_ORDER_PAISE } from "./discount";
import { INDIAN_STATES, PINCODE_PATTERN } from "./india";
import { isPaidStatus } from "./order-status";
import {
  getProvider,
  getShopPaymentConfig,
  type PaymentConfig,
  type ProviderPayment,
  type WebhookEvent,
} from "./payments";
import { isProviderId, type ProviderId } from "./payments/catalog";
import { notifyOrderPaid, notifyStatusChange } from "./notifications";
import { cartLinesSchema, deliveryMethodSchema, quoteCart } from "./pricing";

const PAYMENT_WINDOW_MINUTES = 30;
const FIRST_ORDER_NUMBER = 1001;
const ORDER_NUMBER_ATTEMPTS = 3;

export class CheckoutError extends Error {}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export const checkoutSchema = z.object({
  items: cartLinesSchema,
  couponCode: z.string().trim().max(40).nullish(),
  customer: z.object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    email: z.union([z.email("Enter a valid email"), z.literal("")]).optional(),
  }),
  deliveryMethod: deliveryMethodSchema.default("delivery"),
  address: z
    .object({
      line1: z.string().trim().min(5, "Enter your house number and street").max(200),
      line2: z.string().trim().max(200).optional(),
      city: z.string().trim().min(2, "Enter your town or city").max(80),
      state: z.enum(INDIAN_STATES, { error: "Choose your state" }),
      pincode: z.string().trim().regex(PINCODE_PATTERN, "Enter a valid 6-digit PIN code"),
    })
    .optional(),
  createAccount: z
    .object({ password: z.string().min(8, "Choose a password of at least 8 characters").max(200) })
    .optional(),
}).refine((input) => input.deliveryMethod === "pickup" || input.address, {
  message: "Enter your delivery address",
  path: ["address"],
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

function requirePaymentConfig(shop: Shop) {
  const config = getShopPaymentConfig(shop);
  if (!config) throw new CheckoutError("This shop is not accepting online payments right now");
  return config;
}

type StockLine = { productId: string; variantId: string | null; quantity: number; stockAmount: number | null };

async function takeStock(tx: Tx, line: StockLine) {
  if (line.stockAmount) {
    const shared = await tx.product.updateMany({
      where: { id: line.productId, stock: { gte: line.stockAmount } },
      data: { stock: { decrement: line.stockAmount } },
    });
    return shared.count > 0;
  }
  const where = { stock: { gte: line.quantity } };
  const data = { stock: { decrement: line.quantity } };
  const result = line.variantId
    ? await tx.productVariant.updateMany({ where: { id: line.variantId, ...where }, data })
    : await tx.product.updateMany({ where: { id: line.productId, ...where }, data });
  return result.count > 0;
}

async function returnStock(tx: Tx, line: StockLine) {
  if (line.stockAmount) {
    await tx.product.updateMany({ where: { id: line.productId }, data: { stock: { increment: line.stockAmount } } });
    return;
  }
  const data = { stock: { increment: line.quantity } };
  if (line.variantId) await tx.productVariant.updateMany({ where: { id: line.variantId }, data });
  else await tx.product.update({ where: { id: line.productId }, data });
}

async function releaseStock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId, stockReserved: true } });
  for (const item of items) {
    await returnStock(tx, item);
    await tx.orderItem.update({ where: { id: item.id }, data: { stockReserved: false } });
  }
}

async function reserveStock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId, stockReserved: false } });
  const shortages: string[] = [];
  for (const item of items) {
    if (await takeStock(tx, item)) {
      await tx.orderItem.update({ where: { id: item.id }, data: { stockReserved: true } });
    } else {
      shortages.push(item.name);
    }
  }
  return shortages;
}

async function closeUnpaidOrder(orderId: string, status: Extract<OrderStatus, "EXPIRED" | "FAILED" | "CANCELLED">) {
  await db.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status } });
    if (moved.count) await releaseStock(tx, orderId);
  });
}

const RELEASE_INTERVAL_MS = 60_000;
const lastRelease = new Map<string, number>();

export async function releaseExpiredOrders(shopId: string, { force = false } = {}) {
  const now = Date.now();
  if (!force && now - (lastRelease.get(shopId) ?? 0) < RELEASE_INTERVAL_MS) return;
  lastRelease.set(shopId, now);

  const expired = await db.order.findMany({
    where: { shopId, status: "PENDING", expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const order of expired) await closeUnpaidOrder(order.id, "EXPIRED");
}

async function releaseEarlierAttempts(shopId: string, phone: string) {
  const earlier = await db.order.findMany({
    where: { shopId, customerPhone: phone, status: "PENDING" },
    select: { id: true },
  });
  for (const order of earlier) await closeUnpaidOrder(order.id, "EXPIRED");
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function placeOrder(shop: Shop, input: CheckoutInput, customerAccountId: string | null) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const quote = await quoteCart(
          shop,
          {
            items: input.items,
            couponCode: input.couponCode,
            deliveryMethod: input.deliveryMethod,
            pincode: input.address?.pincode,
          },
          tx,
        );
        if (quote.problems.length) throw new CheckoutError(quote.problems[0]);
        if (input.couponCode && quote.couponError) throw new CheckoutError(quote.couponError);
        if (quote.totalPaise < MIN_ORDER_PAISE) throw new CheckoutError("Order total is too low");

        for (const line of quote.lines) {
          if (!(await takeStock(tx, line))) throw new CheckoutError(`${line.name} just went out of stock`);
        }

        const { name, phone, email } = input.customer;
        const { address } = input;
        const customer = await tx.customer.upsert({
          where: { shopId_phone: { shopId: shop.id, phone } },
          create: { shopId: shop.id, name, phone, email: email || null },
          update: {},
        });

        const last = await tx.order.aggregate({ where: { shopId: shop.id }, _max: { number: true } });

        return tx.order.create({
          data: {
            shopId: shop.id,
            customerId: customer.id,
            customerName: name,
            customerPhone: phone,
            customerEmail: email || null,
            couponId: quote.couponId,
            customerAccountId,
            deliveryMethod: quote.deliveryMethod,
            deliveryFeePaise: quote.deliveryFeePaise,
            number: (last._max.number ?? FIRST_ORDER_NUMBER - 1) + 1,
            accessToken: randomToken(24),
            subtotalPaise: quote.subtotalPaise,
            discountPaise: quote.discountPaise,
            totalPaise: quote.totalPaise,
            addressLine1: address?.line1 ?? "Pickup from the shop",
            addressLine2: address?.line2 || null,
            city: address?.city ?? "",
            state: address?.state ?? "",
            pincode: address?.pincode ?? "",
            expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000),
            items: {
              create: quote.lines.map((line) => ({
                productId: line.productId,
                variantId: line.variantId,
                variantLabel: line.variantLabel,
                gstRate: line.gstRate,
                hsnCode: line.hsnCode,
                name: line.name,
                unitPricePaise: line.unitPricePaise,
                quantity: line.quantity,
                stockAmount: line.stockAmount,
              })),
            },
          },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error) && attempt < ORDER_NUMBER_ATTEMPTS) continue;
      throw error;
    }
  }
}

export async function createCheckout(
  shop: Shop,
  input: CheckoutInput,
  origin: string,
  customerAccountId: string | null = null,
) {
  if (shop.status !== "ACTIVE") throw new CheckoutError("This shop is not accepting orders right now");
  const config = requirePaymentConfig(shop);
  const provider = getProvider(config.provider);

  await releaseExpiredOrders(shop.id, { force: true });
  await releaseEarlierAttempts(shop.id, input.customer.phone);
  const order = await placeOrder(shop, input, customerAccountId);

  try {
    const providerOrder = await provider.createOrder(config, {
      amountPaise: order.totalPaise,
      receipt: `order-${order.number}`,
      description: `${shop.name} · Order #${order.number}`,
      notes: { orderId: order.id, shopId: shop.id },
      returnUrl: `${origin}/checkout/return?provider=${config.provider}&token=${order.accessToken}`,
      cancelUrl: `${origin}/cart?payment=cancelled`,
    });
    await db.order.update({
      where: { id: order.id },
      data: { provider: config.provider, providerOrderId: providerOrder.id },
    });

    return {
      accessToken: order.accessToken,
      amountPaise: order.totalPaise,
      customer: { name: order.customerName, phone: order.customerPhone, email: order.customerEmail },
      checkout: provider.clientCheckout(config, providerOrder),
    };
  } catch (error) {
    console.error("Payment order creation failed", { orderId: order.id, provider: config.provider, error });
    await closeUnpaidOrder(order.id, "FAILED");
    throw new CheckoutError("Could not start the payment. Please try again.");
  }
}

export async function markOrderPaid(shopId: string, provider: ProviderId, payment: ProviderPayment) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await recordPayment(shopId, provider, payment);
    } catch (error) {
      if (isUniqueViolation(error) && attempt < ORDER_NUMBER_ATTEMPTS) continue;
      throw error;
    }
  }
}

async function recordPayment(shopId: string, provider: ProviderId, payment: ProviderPayment) {
  let justPaid = false;
  const order = await db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { shopId, provider, providerOrderId: payment.providerOrderId } });
    if (!order) return null;

    if (payment.amountPaise !== order.totalPaise || payment.currency !== "INR") {
      console.error("Payment amount mismatch", { orderId: order.id, paymentId: payment.id });
      throw new Error("Payment amount does not match the order");
    }

    await tx.payment.upsert({
      where: { provider_providerPaymentId: { provider, providerPaymentId: payment.id } },
      create: {
        orderId: order.id,
        provider,
        providerPaymentId: payment.id,
        method: payment.method,
        amountPaise: payment.amountPaise,
        status: payment.status,
      },
      update: { status: payment.status, method: payment.method },
    });

    if (isPaidStatus(order.status) || order.status === "REFUNDED") return order;

    const shop = await tx.shop.findUniqueOrThrow({ where: { id: shopId }, select: { gstin: true } });
    const lastInvoice = await tx.order.aggregate({ where: { shopId }, _max: { invoiceNumber: true } });
    const moved = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: "PAID",
        paidAt: new Date(),
        invoiceNumber: (lastInvoice._max.invoiceNumber ?? 0) + 1,
        sellerGstin: shop.gstin,
      },
    });
    if (!moved.count) return order;
    justPaid = true;

    if (order.status !== "PENDING") {
      const shortages = await reserveStock(tx, order.id);
      await tx.order.update({
        where: { id: order.id },
        data: {
          attentionNote: shortages.length
            ? `Paid after the order had ${order.status.toLowerCase()}, but ${shortages.join(", ")} ran out of stock. Restock or refund the customer.`
            : `Paid after the order had ${order.status.toLowerCase()}. Stock has been reserved again.`,
        },
      });
    }

    if (order.couponId) {
      await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    }

    return order;
  });

  if (order && justPaid) notifyOrderPaid(order.id);
  return order;
}

export async function confirmClientPayment(shop: Shop, providerInput: string, payload: Record<string, string>) {
  const config = requirePaymentConfig(shop);
  if (!isProviderId(providerInput) || providerInput !== config.provider) {
    throw new CheckoutError("Payment could not be verified");
  }

  const payment = await getProvider(config.provider).confirmClientPayment(config, payload);
  if (payment.status !== "captured") throw new CheckoutError("Payment is not complete yet");

  const order = await markOrderPaid(shop.id, config.provider, payment);
  if (!order) throw new CheckoutError("Order not found");
  return order;
}

export async function recordFailedPayment(shopId: string, provider: ProviderId, payment: ProviderPayment) {
  const order = await db.order.findFirst({ where: { shopId, provider, providerOrderId: payment.providerOrderId } });
  if (!order) return;
  await db.payment.upsert({
    where: { provider_providerPaymentId: { provider, providerPaymentId: payment.id } },
    create: {
      orderId: order.id,
      provider,
      providerPaymentId: payment.id,
      method: payment.method,
      amountPaise: payment.amountPaise,
      status: "failed",
    },
    update: { status: "failed" },
  });
}

export async function expireOrderNow(shopId: string, orderId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, shopId, status: "PENDING" } });
  if (order) await closeUnpaidOrder(order.id, "EXPIRED");
}

export async function handleWebhookEvent(config: PaymentConfig, event: WebhookEvent) {
  if (event.type === "payment.captured") await markOrderPaid(config.shopId, config.provider, event.payment);
  if (event.type === "payment.failed") await recordFailedPayment(config.shopId, config.provider, event.payment);
  if (event.type === "refund.updated") {
    await db.refund.updateMany({ where: { providerRefundId: event.refundId }, data: { status: event.status } });
  }
}

const MANUAL_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["PREPARING", "SHIPPED"],
  PREPARING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
};

export function nextStatuses(status: OrderStatus) {
  return MANUAL_TRANSITIONS[status] ?? [];
}

export async function advanceOrderStatus(shopId: string, orderId: string, status: OrderStatus) {
  const order = await db.order.findFirst({ where: { id: orderId, shopId } });
  if (!order || !nextStatuses(order.status).includes(status)) throw new Error("This status change is not allowed");
  await db.order.update({ where: { id: order.id }, data: { status } });
  notifyStatusChange(order.id, status);
}

export async function cancelPendingOrder(shopId: string, orderId: string) {
  const order = await db.order.findFirst({ where: { id: orderId, shopId, status: "PENDING" } });
  if (!order) throw new Error("Only unpaid orders can be cancelled");
  await closeUnpaidOrder(order.id, "CANCELLED");
}

export async function refundOrder(shop: Shop, orderId: string, userId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, shopId: shop.id },
    include: { payments: { where: { status: "captured" } } },
  });
  const payment = order?.payments[0];
  if (!order || !isPaidStatus(order.status) || !payment) throw new Error("This order cannot be refunded");

  const config = getShopPaymentConfig(shop);
  if (!config || config.provider !== payment.provider) {
    throw new Error("The payment provider used for this order is not set up any more");
  }

  const refund = await getProvider(config.provider).refund(config, payment.providerPaymentId, payment.amountPaise);

  await db.$transaction(async (tx) => {
    await tx.refund.create({
      data: {
        orderId: order.id,
        providerRefundId: refund.id,
        amountPaise: refund.amountPaise,
        status: refund.status,
        createdById: userId,
      },
    });
    await tx.payment.update({ where: { id: payment.id }, data: { status: "refunded" } });
    await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED", attentionNote: null } });
    if (order.status === "PAID") await releaseStock(tx, order.id);
  });
}
