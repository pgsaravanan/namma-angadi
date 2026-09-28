import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  PaymentProviderError,
  type Credentials,
  type PaymentProvider,
  type ProviderPayment,
  type WebhookEvent,
} from "./types";

const API_BASE = "https://api.stripe.com/v1";
const SECRET_KEY_PATTERN = /^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/;
const WEBHOOK_TOLERANCE_SECONDS = 300;
const SESSION_LIFETIME_SECONDS = 31 * 60;

type StripeSession = {
  id: string;
  url: string | null;
  amount_total: number;
  currency: string;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  payment_intent: string | { id: string; payment_method_types?: string[] } | null;
};

type StripeRefund = { id: string; amount: number; status: string };

type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

function formEncode(params: Record<string, string | number>) {
  return new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
}

async function call<T>(credentials: Credentials, path: string, params?: Record<string, string | number>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: params ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${credentials.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params ? formEncode(params) : undefined,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PaymentProviderError(data?.error?.message ?? `Stripe request failed (${response.status})`);
  }
  return data as T;
}

function sessionPayment(session: StripeSession): ProviderPayment {
  const intent = session.payment_intent;
  return {
    id: typeof intent === "string" ? intent : (intent?.id ?? session.id),
    providerOrderId: session.id,
    amountPaise: session.amount_total,
    currency: session.currency.toUpperCase(),
    status: session.payment_status === "paid" ? "captured" : "pending",
    method: typeof intent === "object" ? (intent?.payment_method_types?.[0] ?? "card") : "card",
  };
}

export function isValidStripeSignature(rawBody: string, header: string, secret: string, now = Date.now()) {
  const parts = new Map<string, string[]>();
  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key && value) parts.set(key, [...(parts.get(key) ?? []), value]);
  }

  const timestamp = Number(parts.get("t")?.[0]);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"));
  return (parts.get("v1") ?? []).some((signature) => {
    const received = Buffer.from(signature);
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export const stripe: PaymentProvider = {
  isConfigured: (credentials) => Boolean(credentials.secretKey),

  validateCredentials(credentials) {
    if (!SECRET_KEY_PATTERN.test(credentials.secretKey ?? "")) return "Secret key should look like sk_test_… or sk_live_…";
    if (credentials.webhookSecret && !credentials.webhookSecret.startsWith("whsec_")) {
      return "Webhook signing secret should start with whsec_";
    }
    return null;
  },

  async verifyCredentials({ credentials }) {
    await call(credentials, "/balance");
  },

  async createOrder({ credentials }, input) {
    const separator = input.returnUrl.includes("?") ? "&" : "?";
    const session = await call<StripeSession>(credentials, "/checkout/sessions", {
      mode: "payment",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "inr",
      "line_items[0][price_data][unit_amount]": input.amountPaise,
      "line_items[0][price_data][product_data][name]": input.description,
      client_reference_id: input.receipt,
      success_url: `${input.returnUrl}${separator}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
      ...Object.fromEntries(Object.entries(input.notes).map(([key, value]) => [`metadata[${key}]`, value])),
    });
    if (!session.url) throw new PaymentProviderError("Stripe did not return a checkout page");
    return { id: session.id, redirectUrl: session.url };
  },

  clientCheckout: (_, order) => ({ mode: "redirect", url: order.redirectUrl ?? "/cart?payment=failed" }),

  async confirmClientPayment({ credentials }, payload) {
    const sessionId = payload.session_id ?? "";
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) throw new PaymentProviderError("Payment could not be verified");
    const session = await call<StripeSession>(
      credentials,
      `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent`,
    );
    return sessionPayment(session);
  },

  async refund({ credentials }, providerPaymentId, amountPaise) {
    const refund = await call<StripeRefund>(credentials, "/refunds", {
      payment_intent: providerPaymentId,
      amount: amountPaise,
    });
    return { id: refund.id, amountPaise: refund.amount, status: refund.status };
  },

  parseWebhook({ credentials }, rawBody, headers): WebhookEvent | null {
    const secret = credentials.webhookSecret;
    if (!secret || !isValidStripeSignature(rawBody, headers.get("stripe-signature") ?? "", secret)) return null;

    const event = JSON.parse(rawBody) as StripeEvent;
    const object = event.data.object;

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const payment = sessionPayment(object as unknown as StripeSession);
      return payment.status === "captured" ? { id: event.id, type: "payment.captured", payment } : { id: event.id, type: "ignored" };
    }
    if (event.type === "checkout.session.async_payment_failed") {
      return { id: event.id, type: "payment.failed", payment: { ...sessionPayment(object as unknown as StripeSession), status: "failed" } };
    }
    if (event.type === "refund.updated" || event.type === "refund.created") {
      return { id: event.id, type: "refund.updated", refundId: String(object.id), status: String(object.status) };
    }
    return { id: event.id, type: "ignored" };
  },
};
