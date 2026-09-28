"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ui from "@/components/ui/ui.module.scss";
import { INDIAN_STATES } from "@/lib/india";
import { formatPaise } from "@/lib/money";
import type { PaymentMethod } from "@/lib/payment-methods";
import type { Quote } from "@/lib/pricing";
import { MAX_QUANTITY, useCart } from "./cart-store";
import { postJson, startPayment, type CheckoutResponse } from "./payment-client";
import styles from "./CartView.module.scss";

type Props = {
  shopId: string;
  shopName: string;
  methods: PaymentMethod[];
  acceptsPayments: boolean;
  paymentNotice?: string;
};

const PAYMENT_NOTICES: Record<string, string> = {
  failed: "The payment failed. Please try again.",
  cancelled: "Payment was not completed. You can try again.",
};

const CHECKOUT_REUSE_MS = 20 * 60 * 1000;

export function CartView({ shopId, shopName, methods, acceptsPayments, paymentNotice }: Props) {
  const router = useRouter();
  const { lines, setQuantity, clear } = useCart(shopId);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(paymentNotice ? (PAYMENT_NOTICES[paymentNotice] ?? null) : null);
  const [lastCheckout, setLastCheckout] = useState<{ key: string; at: number; response: CheckoutResponse } | null>(
    null,
  );
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (lines.length === 0) return;
    let cancelled = false;
    postJson<Quote>("/api/cart/quote", { items: lines, couponCode })
      .then((result) => !cancelled && setQuote(result))
      .catch((reason: Error) => !cancelled && setError(reason.message));
    return () => {
      cancelled = true;
    };
  }, [lines, couponCode]);

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

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setPaying(true);

    const request = {
      items: lines,
      couponCode: quote?.couponId ? couponCode : null,
      customer: {
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
      },
      address: {
        line1: form.get("line1"),
        line2: form.get("line2"),
        city: form.get("city"),
        state: form.get("state"),
        pincode: form.get("pincode"),
      },
    };
    const key = JSON.stringify(request);

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
          <p className={ui.muted}>Loading your cart…</p>
        ) : (
          <ul className={styles.lines}>
            {quote.lines.map((line) => (
              <li key={line.productId} className={styles.line}>
                <div>
                  <div className={styles.lineName}>{line.name}</div>
                  <div className={ui.muted}>{formatPaise(line.unitPricePaise)} each</div>
                </div>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    aria-label={`Remove one ${line.name}`}
                    onClick={() => setQuantity(line.productId, line.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${line.name}`}
                    disabled={line.quantity >= Math.min(line.stock, MAX_QUANTITY)}
                    onClick={() => setQuantity(line.productId, line.quantity + 1)}
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
              <dt className={styles.grandTotal}>Total</dt>
              <dd className={styles.grandTotal}>{formatPaise(quote.totalPaise)}</dd>
            </dl>
          )}
        </section>

        <section className={ui.card}>
          <h2 className={styles.heading}>Delivery details</h2>
          <form className={ui.form} onSubmit={handleCheckout}>
            <label className={ui.field}>
              <span className={ui.label}>Full name</span>
              <input className={ui.input} name="name" required minLength={2} autoComplete="name" />
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
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Email (optional)</span>
              <input className={ui.input} name="email" type="email" autoComplete="email" />
            </label>
            <fieldset className={styles.address}>
              <legend className={ui.label}>Delivery address</legend>
              <label className={ui.field}>
                <span className={ui.hint}>House / flat number, building, street</span>
                <input className={ui.input} name="line1" required minLength={5} maxLength={200} autoComplete="address-line1" />
              </label>
              <label className={ui.field}>
                <span className={ui.hint}>Area, locality or landmark (optional)</span>
                <input className={ui.input} name="line2" maxLength={200} autoComplete="address-line2" />
              </label>
              <div className={styles.addressRow}>
                <label className={ui.field}>
                  <span className={ui.hint}>Town / city</span>
                  <input className={ui.input} name="city" required minLength={2} maxLength={80} autoComplete="address-level2" />
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
                  />
                </label>
              </div>
              <label className={ui.field}>
                <span className={ui.hint}>State</span>
                <select className={ui.input} name="state" required defaultValue="" autoComplete="address-level1">
                  <option value="" disabled>
                    Choose your state
                  </option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
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
            <p className={ui.hint}>Payments are processed securely by Razorpay.</p>
          </form>
        </section>
      </aside>
    </div>
  );
}
