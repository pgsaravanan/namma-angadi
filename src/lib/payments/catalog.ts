export const PROVIDER_IDS = ["razorpay", "stripe", "testpay"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type CredentialField = {
  name: string;
  label: string;
  secret: boolean;
  required: boolean;
  placeholder?: string;
};

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  description: string;
  devOnly: boolean;
  supportsWebhooks: boolean;
  fields: CredentialField[];
};

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  razorpay: {
    id: "razorpay",
    label: "Razorpay",
    description: "Real payments into the shop's own Razorpay account.",
    devOnly: false,
    supportsWebhooks: true,
    fields: [
      { name: "keyId", label: "Key ID", secret: false, required: true, placeholder: "rzp_test_…" },
      { name: "keySecret", label: "Key secret", secret: true, required: true },
      { name: "webhookSecret", label: "Webhook secret", secret: true, required: false },
    ],
  },
  stripe: {
    id: "stripe",
    label: "Stripe (cards, for testing)",
    description:
      "Card payments on Stripe's hosted checkout page. Good for testing; for going live in India use Razorpay.",
    devOnly: false,
    supportsWebhooks: true,
    fields: [
      { name: "secretKey", label: "Secret key", secret: true, required: true, placeholder: "sk_test_…" },
      { name: "webhookSecret", label: "Webhook signing secret", secret: true, required: false, placeholder: "whsec_…" },
    ],
  },
  testpay: {
    id: "testpay",
    label: "UPI Simulator (development only)",
    description: "A pretend UPI gateway and UPI app for trying out checkout. No real money, no signup.",
    devOnly: true,
    supportsWebhooks: false,
    fields: [],
  },
};

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}
