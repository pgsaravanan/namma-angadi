import type { ProviderId } from "./catalog";

export type Credentials = Record<string, string>;

export type PaymentConfig = {
  shopId: string;
  provider: ProviderId;
  credentials: Credentials;
};

export type ProviderPayment = {
  id: string;
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  status: "captured" | "authorized" | "pending" | "failed" | "refunded";
  method: string | null;
};

export type ProviderRefund = { id: string; amountPaise: number; status: string };

export type ClientCheckout =
  | { mode: "razorpay"; keyId: string; providerOrderId: string }
  | { mode: "redirect"; url: string };

export type WebhookEvent =
  | { id: string | null; type: "payment.captured"; payment: ProviderPayment }
  | { id: string | null; type: "payment.failed"; payment: ProviderPayment }
  | { id: string | null; type: "refund.updated"; refundId: string; status: string }
  | { id: string | null; type: "ignored" };

export type CreateOrderInput = {
  amountPaise: number;
  receipt: string;
  description: string;
  notes: Record<string, string>;
  returnUrl: string;
  cancelUrl: string;
};

export type ProviderOrder = { id: string; redirectUrl?: string };

export class PaymentProviderError extends Error {}

export interface PaymentProvider {
  isConfigured(credentials: Credentials): boolean;
  validateCredentials(credentials: Credentials): string | null;
  verifyCredentials(config: PaymentConfig): Promise<void>;
  createOrder(config: PaymentConfig, input: CreateOrderInput): Promise<ProviderOrder>;
  clientCheckout(config: PaymentConfig, order: ProviderOrder): ClientCheckout;
  confirmClientPayment(config: PaymentConfig, payload: Record<string, string>): Promise<ProviderPayment>;
  refund(config: PaymentConfig, providerPaymentId: string, amountPaise: number): Promise<ProviderRefund>;
  parseWebhook(config: PaymentConfig, rawBody: string, headers: Headers): WebhookEvent | null;
}
