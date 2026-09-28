import "server-only";
import { isValidHmac } from "../crypto";
import {
  PaymentProviderError,
  type Credentials,
  type PaymentProvider,
  type ProviderPayment,
} from "./types";

const API_BASE = "https://api.razorpay.com/v1";
const KEY_ID_PATTERN = /^rzp_(test|live)_[A-Za-z0-9]{8,32}$/;

type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method: string;
};

type RazorpayRefund = { id: string; amount: number; status: string };

type RazorpayWebhook = {
  event: string;
  payload: {
    payment?: { entity: RazorpayPayment };
    refund?: { entity: RazorpayRefund };
  };
};

async function call<T>(credentials: Credentials, path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString("base64");
  const response = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PaymentProviderError(data?.error?.description ?? `Razorpay request failed (${response.status})`);
  }
  return data as T;
}

function toPayment(payment: RazorpayPayment): ProviderPayment {
  return {
    id: payment.id,
    providerOrderId: payment.order_id,
    amountPaise: payment.amount,
    currency: payment.currency,
    status: payment.status === "created" ? "pending" : payment.status,
    method: payment.method ?? null,
  };
}

export function isValidCheckoutSignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  return isValidHmac(`${orderId}|${paymentId}`, signature, keySecret);
}

export function razorpayMode(keyId: string | undefined) {
  if (!keyId) return null;
  return keyId.startsWith("rzp_live_") ? "live" : "test";
}

export const razorpay: PaymentProvider = {
  isConfigured: (credentials) => Boolean(credentials.keyId && credentials.keySecret),

  validateCredentials(credentials) {
    if (!KEY_ID_PATTERN.test(credentials.keyId ?? "")) return "Key ID should look like rzp_test_… or rzp_live_…";
    if (!credentials.keySecret) return "Enter the Key secret";
    return null;
  },

  async verifyCredentials({ credentials }) {
    await call(credentials, "/orders?count=1");
  },

  async createOrder({ credentials }, { amountPaise, receipt, notes }) {
    const order = await call<{ id: string }>(credentials, "/orders", {
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes,
    });
    return { id: order.id };
  },

  clientCheckout: ({ credentials }, order) => ({ mode: "razorpay", keyId: credentials.keyId, providerOrderId: order.id }),

  async confirmClientPayment({ credentials }, payload) {
    const orderId = payload.razorpay_order_id ?? "";
    const paymentId = payload.razorpay_payment_id ?? "";
    if (!isValidCheckoutSignature(orderId, paymentId, payload.razorpay_signature ?? "", credentials.keySecret)) {
      throw new PaymentProviderError("Payment could not be verified");
    }

    let payment = await call<RazorpayPayment>(credentials, `/payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== orderId) throw new PaymentProviderError("Payment could not be verified");

    if (payment.status === "authorized") {
      payment = await call<RazorpayPayment>(credentials, `/payments/${encodeURIComponent(paymentId)}/capture`, {
        amount: payment.amount,
        currency: payment.currency,
      });
    }
    return toPayment(payment);
  },

  async refund({ credentials }, providerPaymentId, amountPaise) {
    const refund = await call<RazorpayRefund>(credentials, `/payments/${encodeURIComponent(providerPaymentId)}/refund`, {
      amount: amountPaise,
    });
    return { id: refund.id, amountPaise: refund.amount, status: refund.status };
  },

  parseWebhook({ credentials }, rawBody, headers) {
    const secret = credentials.webhookSecret;
    if (!secret || !isValidHmac(rawBody, headers.get("x-razorpay-signature") ?? "", secret)) return null;

    const body = JSON.parse(rawBody) as RazorpayWebhook;
    const id = headers.get("x-razorpay-event-id");
    const payment = body.payload.payment?.entity;
    const refund = body.payload.refund?.entity;

    if ((body.event === "payment.captured" || body.event === "order.paid") && payment?.status === "captured") {
      return { id, type: "payment.captured", payment: toPayment(payment) };
    }
    if (body.event === "payment.failed" && payment) {
      return { id, type: "payment.failed", payment: toPayment(payment) };
    }
    if (refund && body.event.startsWith("refund.")) {
      return { id, type: "refund.updated", refundId: refund.id, status: refund.status };
    }
    return { id, type: "ignored" };
  },
};
