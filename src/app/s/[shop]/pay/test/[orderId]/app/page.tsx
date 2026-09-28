import { notFound } from "next/navigation";
import { OrderStatusPoller } from "@/components/store/OrderStatusPoller";
import { ReturnToMerchant } from "@/components/store/ReturnToMerchant";
import ui from "@/components/ui/ui.module.scss";
import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { getShopPaymentConfig, isProviderEnabled } from "@/lib/payments";
import {
  gatewayStatus,
  latestSimulatedPayment,
  SIMULATOR_SCENARIOS,
  simulatorVpa,
} from "@/lib/payments/testpay";
import { requireShop } from "@/lib/tenant";
import { respondToUpiRequest } from "./actions";
import styles from "./upi-app.module.scss";

export const metadata = { title: "Test UPI app", robots: { index: false } };

const ERRORS: Record<string, string> = {
  pin: "Enter a 4 to 6 digit UPI PIN. Any digits work in the simulator.",
  expired: "This payment request has expired.",
  already: "You have already approved this request.",
};

const timeFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "medium" });

export default async function TestUpiAppPage({ params, searchParams }: PageProps<"/s/[shop]/pay/test/[orderId]/app">) {
  const { orderId } = await params;
  const { from, error } = await searchParams;
  const shop = await requireShop();
  if (!isProviderEnabled("testpay") || getShopPaymentConfig(shop)?.provider !== "testpay") notFound();

  const order = await db.order.findFirst({ where: { shopId: shop.id, provider: "testpay", providerOrderId: orderId } });
  if (!order) notFound();

  const payment = await latestSimulatedPayment(shop.id, orderId);
  const status = gatewayStatus(payment);
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined;
  const openedFrom = typeof from === "string" ? from : null;

  return (
    <main className={styles.page}>
      <div className={styles.phone}>
        <div className={styles.appBar}>
          <span className={styles.appName}>Test UPI app</span>
          {openedFrom && <span className={styles.openedFrom}>opened as {openedFrom}</span>}
        </div>

        {payment && payment.status !== "failed" ? (
          <div className={styles.screen}>
            <OrderStatusPoller />
            <div className={styles.bigTick} aria-hidden>
              {status === "processing" ? "…" : "✓"}
            </div>
            <p className={styles.bigAmount}>{formatPaise(payment.amountPaise)}</p>
            <p className={styles.center}>
              {status === "processing" ? "Payment processing with your bank" : `Paid to ${shop.name}`}
            </p>
            <dl className={styles.details}>
              <dt>To</dt>
              <dd>{simulatorVpa(shop.slug)}</dd>
              <dt>Transaction ID</dt>
              <dd>{payment.id}</dd>
              <dt>Time</dt>
              <dd>{timeFormat.format(payment.createdAt)}</dd>
              <dt>Scenario</dt>
              <dd>{SIMULATOR_SCENARIOS[payment.scenario as keyof typeof SIMULATOR_SCENARIOS] ?? payment.scenario}</dd>
            </dl>
            <div className={styles.log}>
              <p className={ui.label}>What the shop&apos;s server received (webhooks)</p>
              <pre>{payment.webhookLog || "Waiting to send…"}</pre>
            </div>
            {payment.scenario === "webhookOnly" ? (
              <p className={ui.hint}>
                In this scenario the customer does not return to the shop. The webhook alone confirms the order.
              </p>
            ) : (
              <ReturnToMerchant orderId={orderId} shopName={shop.name} />
            )}
          </div>
        ) : order.status !== "PENDING" ? (
          <div className={styles.screen}>
            <p className={styles.center}>This payment request is no longer open.</p>
          </div>
        ) : (
          <form action={respondToUpiRequest.bind(null, orderId)} className={styles.screen}>
            <p className={styles.requestLabel}>Payment request</p>
            <p className={styles.center}>
              <strong>{shop.name}</strong>
              <br />
              <span className={ui.muted}>{simulatorVpa(shop.slug)}</span>
            </p>
            <p className={styles.bigAmount}>{formatPaise(order.totalPaise)}</p>
            <p className={`${styles.center} ${ui.muted}`}>Order #{order.number}</p>

            {payment?.status === "failed" && (
              <p className={`${ui.message} ${ui.error}`}>You declined the last request. You can approve it now.</p>
            )}
            {errorMessage && <p className={`${ui.message} ${ui.error}`}>{errorMessage}</p>}

            <label className={ui.field}>
              <span className={ui.label}>What should happen? (simulator only)</span>
              <select className={ui.input} name="scenario" defaultValue="approve">
                {Object.entries(SIMULATOR_SCENARIOS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className={ui.field}>
              <span className={ui.label}>Enter UPI PIN</span>
              <input
                className={`${ui.input} ${styles.pin}`}
                name="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4,6}"
                maxLength={6}
                autoComplete="off"
                placeholder="••••"
              />
              <span className={ui.hint}>Any 4 to 6 digits. Never enter a real PIN here.</span>
            </label>

            <button type="submit" name="decision" value="approve" className={`${ui.button} ${ui.block}`}>
              Pay {formatPaise(order.totalPaise)}
            </button>
            <button type="submit" name="decision" value="decline" formNoValidate className={`${ui.button} ${ui.secondary} ${ui.block}`}>
              Decline
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
