import "server-only";
import type { Shop } from "@/generated/prisma/client";
import { decryptSecret, encryptSecret } from "../crypto";
import { env } from "../env";
import { isProviderId, PROVIDERS, type ProviderId } from "./catalog";
import { razorpay } from "./razorpay";
import { stripe } from "./stripe";
import { testpay } from "./testpay";
import type { Credentials, PaymentConfig, PaymentProvider } from "./types";

const REGISTRY: Record<ProviderId, PaymentProvider> = { razorpay, stripe, testpay };

export function getProvider(id: ProviderId) {
  return REGISTRY[id];
}

type ModeShop = Pick<Shop, "isLive">;

export function isTestSite() {
  return process.env.SITE_MODE === "preprod";
}

export function isProviderEnabled(id: ProviderId, shop: ModeShop) {
  if (!PROVIDERS[id].devOnly) return true;
  if (shop.isLive) return false;
  return !env.isProduction || (isTestSite() && process.env.ENABLE_TEST_PAYMENTS === "true");
}

export function enabledProviders(shop: ModeShop) {
  return Object.values(PROVIDERS).filter((provider) => isProviderEnabled(provider.id, shop));
}

export function usesLiveKeys(id: ProviderId, credentials: Credentials) {
  return id === "razorpay" && (credentials.keyId ?? "").startsWith("rzp_live_");
}

type StoredCredentials = Partial<Record<ProviderId, Credentials>>;

export function readStoredCredentials(shop: Pick<Shop, "paymentCredentialsEnc">): StoredCredentials {
  if (!shop.paymentCredentialsEnc) return {};
  return JSON.parse(decryptSecret(shop.paymentCredentialsEnc)) as StoredCredentials;
}

export function encryptStoredCredentials(credentials: StoredCredentials) {
  return encryptSecret(JSON.stringify(credentials));
}

export function getShopPaymentConfig(
  shop: Pick<Shop, "id" | "paymentProvider" | "paymentCredentialsEnc" | "isLive">,
): PaymentConfig | null {
  if (!isProviderId(shop.paymentProvider) || !isProviderEnabled(shop.paymentProvider, shop)) return null;

  const credentials = readStoredCredentials(shop)[shop.paymentProvider] ?? {};
  if (!getProvider(shop.paymentProvider).isConfigured(credentials)) return null;
  if (!shop.isLive && usesLiveKeys(shop.paymentProvider, credentials)) return null;

  return { shopId: shop.id, provider: shop.paymentProvider, credentials };
}

export { PaymentProviderError } from "./types";
export type { PaymentConfig, ProviderPayment, WebhookEvent } from "./types";
