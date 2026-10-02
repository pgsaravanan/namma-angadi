import "server-only";
import { z } from "zod";
import type { Shop } from "@/generated/prisma/client";
import { db } from "./db";
import { calculateDiscount } from "./discount";
import { formatPaise } from "./money";
import { shopAvailability } from "./shop-hours";
import { isStockUnit } from "./stock";

export const cartLinesSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(64),
      variantId: z.string().min(1).max(64).nullish(),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .min(1)
  .max(50);

export const deliveryMethodSchema = z.enum(["delivery", "pickup"]);

export type CartLineInput = z.infer<typeof cartLinesSchema>[number];
export type DeliveryMethod = z.infer<typeof deliveryMethodSchema>;

type Client = Pick<typeof db, "product" | "coupon">;

export type PricingShop = Pick<
  Shop,
  | "id"
  | "defaultGstRate"
  | "deliveryEnabled"
  | "pickupEnabled"
  | "deliveryFeePaise"
  | "freeDeliveryAbovePaise"
  | "minOrderPaise"
  | "deliveryPincodes"
  | "isAcceptingOrders"
  | "openTime"
  | "closeTime"
  | "openDays"
>;

export type QuoteLine = {
  productId: string;
  variantId: string | null;
  variantLabel: string | null;
  name: string;
  imageUrl: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  stock: number;
  stockAmount: number | null;
  gstRate: number;
  hsnCode: string | null;
};

export type Quote = {
  lines: QuoteLine[];
  problems: string[];
  subtotalPaise: number;
  discountPaise: number;
  deliveryMethod: DeliveryMethod;
  deliveryFeePaise: number;
  freeDeliveryAbovePaise: number | null;
  totalPaise: number;
  couponId: string | null;
  couponError: string | null;
};

export type QuoteInput = {
  items: CartLineInput[];
  couponCode?: string | null;
  deliveryMethod?: DeliveryMethod | null;
  pincode?: string | null;
};

function lineKey(line: { productId: string; variantId?: string | null }) {
  return `${line.productId}:${line.variantId ?? ""}`;
}

function mergeLines(lines: CartLineInput[]) {
  const merged = new Map<string, CartLineInput>();
  for (const line of lines) {
    const key = lineKey(line);
    const existing = merged.get(key);
    merged.set(key, { ...line, quantity: (existing?.quantity ?? 0) + line.quantity });
  }
  return [...merged.values()];
}

export function allowedPincodes(shop: Pick<Shop, "deliveryPincodes">) {
  return (shop.deliveryPincodes ?? "").split(/[\s,]+/).filter(Boolean);
}

export function defaultDeliveryMethod(shop: Pick<Shop, "deliveryEnabled" | "pickupEnabled">): DeliveryMethod {
  return shop.deliveryEnabled || !shop.pickupEnabled ? "delivery" : "pickup";
}

export async function quoteCart(shop: PricingShop, input: QuoteInput, client: Client = db): Promise<Quote> {
  const requested = mergeLines(input.items);
  const products = await client.product.findMany({
    where: { shopId: shop.id, isActive: true, id: { in: [...new Set(requested.map((line) => line.productId))] } },
    include: { variants: true },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines: QuoteLine[] = [];
  const problems: string[] = [];
  const sharedLeft = new Map(products.filter((product) => isStockUnit(product.stockUnit)).map((product) => [product.id, product.stock]));

  for (const line of requested) {
    const product = byId.get(line.productId);
    const variant = product?.variants.length
      ? product.variants.find((candidate) => candidate.id === line.variantId)
      : undefined;

    if (!product || (product.variants.length > 0 && !variant)) {
      problems.push("An item in your bag is no longer available. Please remove it.");
      continue;
    }

    const name = variant ? `${product.name} (${variant.label})` : product.name;
    const unitPricePaise = variant?.pricePaise ?? product.pricePaise;
    const packAmount = sharedLeft.has(product.id) ? (variant?.packAmount ?? null) : null;
    let stock = variant?.stock ?? product.stock;
    if (sharedLeft.has(product.id)) {
      const left = sharedLeft.get(product.id)!;
      stock = packAmount ? Math.floor(left / packAmount) : 0;
      if (packAmount) sharedLeft.set(product.id, left - Math.min(stock, line.quantity) * packAmount);
    }
    if (stock < line.quantity) problems.push(stock === 0 ? `${name} is sold out` : `Only ${stock} of ${name} left`);

    lines.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      variantLabel: variant?.label ?? null,
      name,
      imageUrl: product.imageUrl,
      unitPricePaise,
      quantity: line.quantity,
      lineTotalPaise: unitPricePaise * line.quantity,
      stock,
      stockAmount: packAmount ? packAmount * line.quantity : null,
      gstRate: product.gstRate ?? shop.defaultGstRate,
      hsnCode: product.hsnCode,
    });
  }

  const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  let discountPaise = 0;
  let couponId: string | null = null;
  let couponError: string | null = null;

  const code = input.couponCode?.trim().toUpperCase();
  if (code) {
    const coupon = await client.coupon.findUnique({ where: { shopId_code: { shopId: shop.id, code } } });
    const result = coupon ? calculateDiscount(coupon, subtotalPaise) : { ok: false as const, error: "Invalid coupon code" };
    if (result.ok) {
      discountPaise = result.discountPaise;
      couponId = coupon!.id;
    } else {
      couponError = result.error;
    }
  }

  const deliveryMethod = input.deliveryMethod ?? defaultDeliveryMethod(shop);
  if (deliveryMethod === "delivery" && !shop.deliveryEnabled) problems.push("Delivery isn't available. Please choose pickup.");
  if (deliveryMethod === "pickup" && !shop.pickupEnabled) problems.push("Pickup isn't available for this shop.");

  const pincodes = allowedPincodes(shop);
  const pincode = input.pincode?.trim();
  if (deliveryMethod === "delivery" && pincode && pincodes.length && !pincodes.includes(pincode)) {
    problems.push(`Sorry, we don't deliver to ${pincode} yet.${shop.pickupEnabled ? " You can choose pickup instead." : ""}`);
  }

  if (subtotalPaise > 0 && subtotalPaise < shop.minOrderPaise) {
    problems.push(`The minimum order is ${formatPaise(shop.minOrderPaise)}. Add a little more to continue.`);
  }

  const availability = shopAvailability(shop);
  if (!availability.open) problems.push(availability.message);

  const afterDiscount = subtotalPaise - discountPaise;
  const qualifiesForFree = shop.freeDeliveryAbovePaise !== null && afterDiscount >= shop.freeDeliveryAbovePaise;
  const deliveryFeePaise = deliveryMethod === "delivery" && !qualifiesForFree ? shop.deliveryFeePaise : 0;

  return {
    lines,
    problems,
    subtotalPaise,
    discountPaise,
    deliveryMethod,
    deliveryFeePaise,
    freeDeliveryAbovePaise: deliveryMethod === "delivery" ? shop.freeDeliveryAbovePaise : null,
    totalPaise: afterDiscount + deliveryFeePaise,
    couponId,
    couponError,
  };
}
