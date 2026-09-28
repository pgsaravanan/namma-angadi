import styles from "@/components/admin/AdminShell.module.scss";
import {
  PaymentSettingsForm,
  ShopDetailsForm,
  StorefrontForm,
  type SavedCredentials,
} from "@/components/admin/SettingsForms";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { env } from "@/lib/env";
import { shopBaseUrl } from "@/lib/host";
import { parsePaymentMethods } from "@/lib/payment-methods";
import { enabledProviders, readStoredCredentials } from "@/lib/payments";
import { isProviderId } from "@/lib/payments/catalog";
import { razorpayMode } from "@/lib/payments/razorpay";
import { savePaymentSettings, saveShopDetails, saveStorefront } from "./actions";

export default async function SettingsPage() {
  const { shop } = await requireShopPermission("settings:manage");
  const storeUrl = shopBaseUrl(shop.slug, env.rootDomain, shop.customDomain);
  const providers = enabledProviders();
  const stored = readStoredCredentials(shop);

  const saved: SavedCredentials = Object.fromEntries(
    providers.map((provider) => {
      const credentials = stored[provider.id] ?? {};
      return [
        provider.id,
        {
          values: Object.fromEntries(
            provider.fields.filter((field) => !field.secret).map((field) => [field.name, credentials[field.name] ?? ""]),
          ),
          secretsSaved: provider.fields.filter((field) => field.secret && credentials[field.name]).map((field) => field.name),
        },
      ];
    }),
  );

  const mode = shop.paymentProvider === "razorpay" ? razorpayMode(stored.razorpay?.keyId) : null;

  return (
    <div className={styles.section}>
      <h1 className={styles.pageTitle}>Settings</h1>

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Shop details</h2>
        <p className={ui.muted}>
          Store address: <a href={storeUrl}>{storeUrl}</a>
        </p>
        <ShopDetailsForm action={saveShopDetails} shop={shop} />
      </section>

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Storefront</h2>
        <StorefrontForm action={saveStorefront} shop={shop} />
      </section>

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>
          Online payments {mode && <span className={ui.muted}>({mode === "live" ? "Live mode" : "Test mode"})</span>}
        </h2>
        <PaymentSettingsForm
          action={savePaymentSettings}
          providers={providers}
          current={isProviderId(shop.paymentProvider) ? shop.paymentProvider : null}
          saved={saved}
          webhookBaseUrl={`${storeUrl}/api/webhooks`}
          methods={parsePaymentMethods(shop.paymentMethods)}
        />
      </section>
    </div>
  );
}
