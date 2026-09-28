"use client";

import type { PaymentMethod } from "@/lib/payment-methods";
import type { ClientCheckout } from "@/lib/payments/types";

export type CheckoutResponse = {
  accessToken: string;
  amountPaise: number;
  customer: { name: string; phone: string; email: string | null };
  checkout: ClientCheckout;
};

type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

type RazorpayInstance = { open: () => void; on: (event: "payment.failed", handler: () => void) => void };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  upi: "Pay using UPI",
  card: "Pay using card",
  netbanking: "Pay using netbanking",
  wallet: "Pay using wallet",
};

let razorpayLoader: Promise<void> | null = null;

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  razorpayLoader ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayLoader = null;
      reject(new Error("Could not load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return razorpayLoader;
}

export type PaymentCallbacks = {
  onPaid: (provider: string, payload: Record<string, string>) => void;
  onDismiss: () => void;
  onFailure: () => void;
};

type StartPaymentOptions = {
  response: CheckoutResponse;
  shopName: string;
  methods: PaymentMethod[];
} & PaymentCallbacks;

export async function startPayment({ response, shopName, methods, onPaid, onDismiss, onFailure }: StartPaymentOptions) {
  const { checkout } = response;

  if (checkout.mode === "redirect") {
    window.location.assign(checkout.url);
    return;
  }

  await loadRazorpay();
  if (!window.Razorpay) throw new Error("Payment window is unavailable");

  const blocks = Object.fromEntries(
    methods.map((method) => [method, { name: METHOD_LABELS[method], instruments: [{ method }] }]),
  );

  const razorpay = new window.Razorpay({
    key: checkout.keyId,
    order_id: checkout.providerOrderId,
    amount: response.amountPaise,
    currency: "INR",
    name: shopName,
    prefill: { name: response.customer.name, contact: response.customer.phone, email: response.customer.email ?? "" },
    config: {
      display: {
        blocks,
        sequence: methods.map((method) => `block.${method}`),
        preferences: { show_default_blocks: false },
      },
    },
    handler: (result: RazorpaySuccess) => onPaid("razorpay", { ...result }),
    modal: { ondismiss: onDismiss, confirm_close: true },
    retry: { enabled: true, max_count: 3 },
  });
  razorpay.on("payment.failed", onFailure);
  razorpay.open();
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}
