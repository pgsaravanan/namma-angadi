"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import ui from "@/components/ui/ui.module.scss";
import { StateSelect } from "@/components/ui/StateSelect";
import { formatPaise } from "@/lib/money";
import type { PaymentMethod } from "@/lib/payment-methods";
import type { DeliveryMethod, Quote } from "@/lib/pricing";
import { MAX_QUANTITY, useCart } from "./cart-store";
import { postJson, startPayment, type CheckoutResponse } from "./payment-client";
import styles from "./CartView.module.scss";

export type SavedDetails = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

type Props = {
  shopId: string;
  shopName: string;
  methods: PaymentMethod[];
  acceptsPayments: boolean;
  paymentNotice?: string;
  fulfilment: { deliveryEnabled: boolean; pickupEnabled: boolean; pickupAddress: string | null; deliveryNote: string | null };
  account: (SavedDetails & { email: string }) | null;
};

const PAYMENT_NOTICES: Record<string, string> = {
  failed: "The payment failed. Please try again.",
  cancelled: "Payment was not completed. You can try again.",
};

const CHECKOUT_REUSE_MS = 20 * 60 * 1000;
const PINCODE = /^[1-9][0-9]{5}$/;

function storageKey(shopId: string, name: string) {
  return `namma-angadi:${name}:${shopId}`;
}

function readStored<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const noop = () => () => {};

export function CartView({ shopId, shopName, methods, acceptsPayments, paymentNotice, fulfilment, account }: Props) {
  const router = useRouter();
  const { lines, setQuantity, clear } = useCart(shopId);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const remembered = useMemo(
    () => (hydrated && !account ? readStored<SavedDetails>(storageKey(shopId, "details")) : null),
    [hydrated, account, shopId],
  );
  const details = account ?? remembered;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    fulfilment.deliveryEnabled || !fulfilment.pickupEnabled ? "delivery" : "pickup",
  );
  const [typedPincode, setPincode] = useState<string | null>(null);
  const pincode = typedPincode ?? details?.pincode ?? "";
  const [createAccount, setCreateAccount] = useState(false);
  const [error, setError] = useState<string | null>(paymentNotice ? (PAYMENT_NOTICES[paymentNotice] ?? null) : null);
  const [lastCheckout, setLastCheckout] = useState<{ key: string; at: number; response: CheckoutResponse } | null>(null);
  const [paying, setPaying] = useState(false);

  const quotePincode = deliveryMethod === "delivery" && PINCODE.test(pincode) ? pincode : null;

  useEffect(() => {
    if (lines.length === 0) return;
    let cancelled = false;
    postJson<Quote>("/api/cart/quote", { items: lines, couponCode, deliveryMethod, pincode: quotePincode })
      .then((result) => !cancelled && setQuote(result))
      .catch((reason: Error) => !cancelled && setError(reason.message));
    return () => {
      cancelled = true;
    };
  }, [lines, couponCode, deliveryMethod, quotePincode]);

  if (lines.length === 0) {
    return (
      <div className={ui.empty}>
        <p>Your bag is empty.</p>
        <Link href="/" className={ui.button}>
          Continue shopping
        </Link>
      </div>
    );
  }

  const canPay = acceptsPayments && quote !== null && quote.problems.length === 0 && !paying;
  const freeDeliveryGap =
    quote?.freeDeliveryAbovePaise && quote.deliveryFeePaise > 0
      ? quote.freeDeliveryAbovePaise - (quote.subtotalPaise - quote.discountPaise)
      : 0;

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    setError(null);
    setPaying(true);

    const saved: SavedDetails = {
      name: text("name"),
      phone: text("phone"),
      email: text("email"),
      line1: text("line1"),
      line2: text("line2"),
      city: text("city"),
      state: text("state"),
      pincode: text("pincode"),
    };
    writeStored(storageKey(shopId, "details"), saved);

    const request = {
      items: lines,
      couponCode: quote?.couponId ? couponCode : null,
      deliveryMethod,
      customer: { name: saved.name, phone: saved.phone, email: saved.email },
      address:
        deliveryMethod === "delivery"
          ? { line1: saved.line1, line2: saved.line2, city: saved.city, state: saved.state, pincode: saved.pincode }
          : undefined,
      createAccount: !account && createAccount ? { password: String(form.get("password") ?? "") } : undefined,
    };
    const key = JSON.stringify({ ...request, createAccount: undefined });

    try {
      const reusable = lastCheckout && lastCheckout.key === key && Date.now() - lastCheckout.at < CHECKOUT_REUSE_MS;
      const response = reusable ? lastCheckout.response : await postJson<CheckoutResponse>("/api/checkout", request);
      if (!reusable) setLastCheckout({ key, at: Date.now(), response });

      await startPayment({
        response,
        shopName,
        methods,
        onPaid: async (provider, payload) => {
          try {
            await postJson("/api/checkout/verify", { provider, payload });
          } catch {
            // The webhook still confirms the order; the order page keeps checking.
          }
          clear();
          router.push(`/orders/${response.accessToken}`);
        },
        onDismiss: () => {
          setPaying(false);
          setError(PAYMENT_NOTICES.cancelled);
        },
        onFailure: () => setError(PAYMENT_NOTICES.failed),
      });
    } catch (reason) {
      setPaying(false);
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className={styles.layout}>
      <section className={ui.card}>
        <h2 className={styles.heading}>Your items</h2>
        {!quote ? (
          <p className={ui.muted}>Loading your bag…</p>
        ) : (
          <ul className={styles.lines}>
            {quote.lines.map((line) => (
              <li key={`${line.productId}:${line.variantId ?? ""}`} className={styles.line}>
                <div>
                  <div className={styles.lineName}>{line.name}</div>
                  <div className={ui.muted}>{formatPaise(line.unitPricePaise)} each</div>
                </div>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    aria-label={`Remove one ${line.name}`}
                    onClick={() => setQuantity(line.productId, line.variantId, line.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${line.name}`}
                    disabled={line.quantity >= Math.min(line.stock, MAX_QUANTITY)}
                    onClick={() => setQuantity(line.productId, line.variantId, line.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <div className={styles.lineTotal}>{formatPaise(line.lineTotalPaise)}</div>
              </li>
            ))}
          </ul>
        )}
        {quote?.problems.map((problem) => (
          <p key={problem} className={`${ui.message} ${ui.error}`}>
            {problem}
          </p>
        ))}
      </section>

      <aside className={styles.side}>
        <section className={ui.card}>
          <h2 className={styles.heading}>Summary</h2>
          <form
            className={styles.coupon}
            onSubmit={(event) => {
              event.preventDefault();
              setCouponCode(couponInput.trim() || null);
            }}
          >
            <input
              className={ui.input}
              placeholder="Coupon code"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
              aria-label="Coupon code"
            />
            <button type="submit" className={`${ui.button} ${ui.secondary}`}>
              Apply
            </button>
          </form>
          {quote?.couponError && <p className={`${ui.message} ${ui.error}`}>{quote.couponError}</p>}
          {quote && (
            <dl className={styles.totals}>
              <dt>Subtotal</dt>
              <dd>{formatPaise(quote.subtotalPaise)}</dd>
              {quote.discountPaise > 0 && (
                <>
                  <dt>Discount ({couponCode})</dt>
                  <dd>− {formatPaise(quote.discountPaise)}</dd>
                </>
              )}
              <dt>{deliveryMethod === "pickup" ? "Pickup" : "Delivery"}</dt>
              <dd>{quote.deliveryFeePaise ? formatPaise(quote.deliveryFeePaise) : "Free"}</dd>
              <dt className={styles.grandTotal}>Total</dt>
              <dd className={styles.grandTotal}>{formatPaise(quote.totalPaise)}</dd>
            </dl>
          )}
          {freeDeliveryGap > 0 && (
            <p className={ui.hint}>Add {formatPaise(freeDeliveryGap)} more for free delivery.</p>
          )}
        </section>

        <section className={ui.card}>
          <form key={details ? "prefilled" : "blank"} className={ui.form} onSubmit={handleCheckout}>
            {fulfilment.deliveryEnabled && fulfilment.pickupEnabled && (
              <fieldset className={styles.methods}>
                <legend className={styles.heading}>How would you like it?</legend>
                {(["delivery", "pickup"] as const).map((method) => (
                  <label key={method} className={deliveryMethod === method ? `${styles.method} ${styles.methodActive}` : styles.method}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value={method}
                      checked={deliveryMethod === method}
                      onChange={() => setDeliveryMethod(method)}
                    />
                    <span>
                      <strong>{method === "delivery" ? "Delivery" : "Pickup from the shop"}</strong>
                      <small>
                        {method === "delivery"
                          ? (fulfilment.deliveryNote ?? "We deliver to your address")
                          : (fulfilment.pickupAddress ?? "Collect your order from us")}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <h2 className={styles.heading}>Your details</h2>
            {account ? (
              <p className={ui.hint}>
                Signed in as {account.email}. <Link href="/account">My account</Link>
              </p>
            ) : (
              <p className={ui.hint}>
                Been here before? <Link href="/account/login?next=/cart">Sign in</Link> for faster checkout.
              </p>
            )}
            <label className={ui.field}>
              <span className={ui.label}>Full name</span>
              <input className={ui.input} name="name" required minLength={2} autoComplete="name" defaultValue={details?.name} />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Mobile number</span>
              <input
                className={ui.input}
                name="phone"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                autoComplete="tel-national"
                title="10-digit mobile number"
                defaultValue={details?.phone}
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Email {createAccount ? "" : "(optional, for your bill and updates)"}</span>
              <input
                className={ui.input}
                name="email"
                type="email"
                autoComplete="email"
                required={createAccount}
                defaultValue={details?.email}
                readOnly={Boolean(account)}
              />
            </label>

            {deliveryMethod === "delivery" && (
              <fieldset className={styles.address}>
                <legend className={ui.label}>Delivery address</legend>
                <label className={ui.field}>
                  <span className={ui.hint}>House / flat number, building, street</span>
                  <input
                    className={ui.input}
                    name="line1"
                    required
                    minLength={5}
                    maxLength={200}
                    autoComplete="address-line1"
                    defaultValue={details?.line1}
                  />
                </label>
                <label className={ui.field}>
                  <span className={ui.hint}>Area, locality or landmark (optional)</span>
                  <input
                    className={ui.input}
                    name="line2"
                    maxLength={200}
                    autoComplete="address-line2"
                    defaultValue={details?.line2}
                  />
                </label>
                <div className={styles.addressRow}>
                  <label className={ui.field}>
                    <span className={ui.hint}>Town / city</span>
                    <input
                      className={ui.input}
                      name="city"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="address-level2"
                      defaultValue={details?.city}
                    />
                  </label>
                  <label className={ui.field}>
                    <span className={ui.hint}>PIN code</span>
                    <input
                      className={ui.input}
                      name="pincode"
                      required
                      inputMode="numeric"
                      pattern="[1-9][0-9]{5}"
                      maxLength={6}
                      autoComplete="postal-code"
                      title="6-digit PIN code"
                      defaultValue={details?.pincode}
                      onChange={(event) => setPincode(event.target.value.trim())}
                    />
                  </label>
                </div>
                <label className={ui.field}>
                  <span className={ui.hint}>State</span>
                  <StateSelect name="state" required defaultValue={details?.state} autoComplete="address-level1" />
                </label>
              </fieldset>
            )}

            {!account && (
              <div className={styles.accountBox}>
                <label className={ui.checkbox}>
                  <input type="checkbox" checked={createAccount} onChange={(event) => setCreateAccount(event.target.checked)} />
                  Create an account to see your orders and bills, and check out faster next time
                </label>
                {createAccount && (
                  <label className={ui.field}>
                    <span className={ui.label}>Choose a password</span>
                    <input className={ui.input} name="password" type="password" required minLength={8} autoComplete="new-password" />
                  </label>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className={`${ui.message} ${ui.error}`}>
                {error}
              </p>
            )}
            {!acceptsPayments && (
              <p className={`${ui.message} ${ui.error}`}>This shop is not accepting online payments yet.</p>
            )}
            <button type="submit" className={`${ui.button} ${ui.block}`} disabled={!canPay}>
              {paying ? "Opening payment…" : quote ? `Pay ${formatPaise(quote.totalPaise)}` : "Pay"}
            </button>
            <p className={ui.hint}>Secure UPI payment. Your details are only used for this order.</p>
          </form>
        </section>
      </aside>
    </div>
  );
}
