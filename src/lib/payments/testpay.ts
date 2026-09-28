import "server-only";
import { createHmac } from "node:crypto";
import { after } from "next/server";
import type { SimulatedPayment } from "@/generated/prisma/client";
import { isValidHmac, randomToken } from "../crypto";
import { db } from "../db";
import { env } from "../env";
import { PaymentProviderError, type PaymentConfig, type PaymentProvider, type WebhookEvent } from "./types";

const SLOW_BANK_SECONDS = 20;

export const SIMULATOR_SCENARIOS = {
  approve: "Approve straight away",
  slow: `Bank is slow (confirms after ${SLOW_BANK_SECONDS} seconds)`,
  duplicate: "Approve, and the webhook arrives twice",
  webhookOnly: "Approve, but the customer closed the checkout tab",
  late: "Approve after the order has expired",
} as const;

export type SimulatorScenario = keyof typeof SIMULATOR_SCENARIOS;

export function isSimulatorScenario(value: unknown): value is SimulatorScenario {
  return typeof value === "string" && value in SIMULATOR_SCENARIOS;
}

export type GatewayStatus = "waiting" | "processing" | "captured" | "failed";

type SimulatorWebhook = {
  id: string;
  type: "payment.captured" | "payment.failed";
  payment: { id: string; order_id: string; amount: number; method: string };
};

function signingSecret(shopId: string) {
  return createHmac("sha256", env.encryptionKey).update(`testpay:${shopId}`).digest("hex");
}

function sign(shopId: string, value: string) {
  return createHmac("sha256", signingSecret(shopId)).update(value).digest("hex");
}

function returnFields(payment: { orderId: string; paymentId: string; amount: string; method: string }) {
  return `${payment.orderId}|${payment.paymentId}|${payment.amount}|${payment.method}`;
}

export function signReturnPayload(
  config: PaymentConfig,
  payment: { orderId: string; paymentId: string; amountPaise: number; method: string },
) {
  const fields = { ...payment, amount: String(payment.amountPaise) };
  return {
    order_id: fields.orderId,
    payment_id: fields.paymentId,
    amount: fields.amount,
    method: fields.method,
    signature: sign(config.shopId, returnFields(fields)),
  };
}

export function simulatorVpa(shopSlug: string) {
  return `${shopSlug.replace(/-/g, "")}@testupi`;
}

export function gatewayStatus(payment: SimulatedPayment | null): GatewayStatus {
  if (!payment) return "waiting";
  if (payment.status === "failed") return "failed";
  return payment.settlesAt <= new Date() ? "captured" : "processing";
}

export async function latestSimulatedPayment(shopId: string, providerOrderId: string) {
  return db.simulatedPayment.findFirst({ where: { shopId, providerOrderId }, orderBy: { createdAt: "desc" } });
}

async function deliverWebhook(config: PaymentConfig, origin: string, simulatedPaymentId: string, event: SimulatorWebhook) {
  const body = JSON.stringify(event);
  let outcome: string;
  try {
    const response = await fetch(`${origin}/api/webhooks/testpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-testpay-signature": sign(config.shopId, body),
        "x-testpay-event-id": event.id,
      },
      body,
      cache: "no-store",
    });
    outcome = `${response.status} ${(await response.text()).slice(0, 60)}`;
  } catch (error) {
    outcome = `failed to connect: ${error instanceof Error ? error.message : "unknown error"}`;
  }

  const current = await db.simulatedPayment.findUnique({ where: { id: simulatedPaymentId } });
  const line = `${new Date().toLocaleTimeString("en-IN")} · ${event.type} → ${outcome}`;
  await db.simulatedPayment.update({
    where: { id: simulatedPaymentId },
    data: { webhookLog: current?.webhookLog ? `${current.webhookLog}\n${line}` : line },
  });
}

export async function simulateUpiPayment(
  config: PaymentConfig,
  input: {
    providerOrderId: string;
    amountPaise: number;
    method: string;
    scenario: SimulatorScenario | "decline";
    origin: string;
  },
) {
  const existing = await latestSimulatedPayment(config.shopId, input.providerOrderId);
  if (existing && existing.status !== "failed") throw new PaymentProviderError("This request was already approved");

  const declined = input.scenario === "decline";
  const settlesAt = new Date(Date.now() + (input.scenario === "slow" ? SLOW_BANK_SECONDS * 1000 : 0));
  const payment = await db.simulatedPayment.create({
    data: {
      id: `tp_pay_${randomToken(12)}`,
      shopId: config.shopId,
      providerOrderId: input.providerOrderId,
      amountPaise: input.amountPaise,
      method: input.method,
      scenario: input.scenario,
      status: declined ? "failed" : "captured",
      settlesAt,
    },
  });

  const event: SimulatorWebhook = {
    id: `tp_evt_${randomToken(12)}`,
    type: declined ? "payment.failed" : "payment.captured",
    payment: { id: payment.id, order_id: input.providerOrderId, amount: input.amountPaise, method: input.method },
  };
  const deliveries = input.scenario === "duplicate" ? 2 : 1;

  after(async () => {
    const delay = settlesAt.getTime() - Date.now();
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    for (let attempt = 0; attempt < deliveries; attempt++) {
      await deliverWebhook(config, input.origin, payment.id, event);
    }
  });

  return payment;
}

export const testpay: PaymentProvider = {
  isConfigured: () => true,
  validateCredentials: () => null,
  verifyCredentials: async () => {},

  createOrder: async () => ({ id: `tp_order_${randomToken(12)}` }),

  clientCheckout: (_, order) => ({ mode: "redirect", url: `/pay/test/${order.id}` }),

  async confirmClientPayment(config, payload) {
    const fields = {
      orderId: payload.order_id ?? "",
      paymentId: payload.payment_id ?? "",
      amount: payload.amount ?? "",
      method: payload.method ?? "",
    };
    if (!isValidHmac(returnFields(fields), payload.signature ?? "", signingSecret(config.shopId))) {
      throw new PaymentProviderError("Payment could not be verified");
    }
    return {
      id: fields.paymentId,
      providerOrderId: fields.orderId,
      amountPaise: Number(fields.amount),
      currency: "INR",
      status: "captured",
      method: fields.method,
    };
  },

  refund: async (_, __, amountPaise) => ({ id: `tp_rfnd_${randomToken(12)}`, amountPaise, status: "processed" }),

  parseWebhook(config, rawBody, headers): WebhookEvent | null {
    if (!isValidHmac(rawBody, headers.get("x-testpay-signature") ?? "", signingSecret(config.shopId))) return null;

    const body = JSON.parse(rawBody) as SimulatorWebhook;
    const payment = {
      id: body.payment.id,
      providerOrderId: body.payment.order_id,
      amountPaise: body.payment.amount,
      currency: "INR",
      method: body.payment.method,
    };
    return body.type === "payment.captured"
      ? { id: body.id, type: "payment.captured", payment: { ...payment, status: "captured" } }
      : { id: body.id, type: "payment.failed", payment: { ...payment, status: "failed" } };
  },
};
