"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ui from "@/components/ui/ui.module.scss";
import { formatPaise } from "@/lib/money";
import styles from "./UpiGateway.module.scss";

type Props = {
  orderId: string;
  shopName: string;
  orderNumber: number;
  amountPaise: number;
  vpa: string;
  appPath: string;
  qrDataUrl: string;
  expiresAt: string;
};

type GatewayState =
  | { status: "waiting" | "processing" | "failed" | "expired"; orderUrl: string; paymentId?: string | null }
  | { status: "captured"; redirectUrl: string | null; orderUrl: string };

const UPI_APPS = ["PhonePe", "Google Pay", "Paytm", "BHIM"];
const VPA_PATTERN = /^[a-z0-9._-]{2,}@[a-z]{2,}$/i;
const POLL_MS = 2000;

function formatCountdown(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function UpiGateway({ orderId, shopName, orderNumber, amountPaise, vpa, appPath, qrDataUrl, expiresAt }: Props) {
  const [waiting, setWaiting] = useState<string | null>(null);
  const [customerVpa, setCustomerVpa] = useState("");
  const [vpaError, setVpaError] = useState<string | null>(null);
  const [state, setState] = useState<GatewayState | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dismissedFailure, setDismissedFailure] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const response = await fetch(`/pay/test/${orderId}/status`, { cache: "no-store" });
        const next = (await response.json()) as GatewayState;
        if (stopped) return;
        setState(next);
        if (next.status === "captured" && next.redirectUrl) window.location.assign(next.redirectUrl);
      } catch {}
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orderId]);

  useEffect(() => {
    const deadline = new Date(expiresAt).getTime();
    const tick = () => setRemaining(deadline - Date.now());
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [expiresAt]);

  function openApp(name: string) {
    window.open(`${appPath}?from=${encodeURIComponent(name)}`, "_blank", "noopener");
    setWaiting(`Approve the payment in ${name}`);
  }

  function sendCollectRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!VPA_PATTERN.test(customerVpa.trim())) {
      setVpaError("Enter a UPI ID like yourname@okaxis");
      return;
    }
    setVpaError(null);
    setWaiting(`We sent a payment request to ${customerVpa.trim()}`);
  }

  const failureDismissed = state?.status === "failed" && state.paymentId === dismissedFailure;
  const status = !state || failureDismissed ? "waiting" : state.status;
  const header = (
    <div className={styles.header}>
      <div>
        <div className={styles.merchant}>{shopName}</div>
        <div className={ui.muted}>
          Order #{orderNumber} · pay to {vpa}
        </div>
      </div>
      <div className={styles.amount}>{formatPaise(amountPaise)}</div>
    </div>
  );

  let body: React.ReactNode;

  if (status === "captured") {
    body = (
      <div className={styles.result}>
        <div className={styles.tick} aria-hidden>
          ✓
        </div>
        <h2>Payment received</h2>
        {state?.status === "captured" && state.redirectUrl ? (
          <p className={ui.muted}>Taking you back to {shopName}…</p>
        ) : (
          <>
            <p className={ui.muted}>
              In this scenario the customer closed the checkout tab, so the shop only hears about the payment through the
              webhook. Open the order to see it confirmed.
            </p>
            <Link href={state?.orderUrl ?? "/"} className={ui.button}>
              View order
            </Link>
          </>
        )}
      </div>
    );
  } else if (status === "failed") {
    body = (
      <div className={styles.result}>
        <div className={`${styles.tick} ${styles.cross}`} aria-hidden>
          ✕
        </div>
        <h2>Payment declined</h2>
        <p className={ui.muted}>The payment was declined in the UPI app. No money was taken.</p>
        <div className={styles.row}>
          <button
            type="button"
            className={ui.button}
            onClick={() => {
              setWaiting(null);
              setDismissedFailure(state?.status === "failed" ? (state.paymentId ?? null) : null);
            }}
          >
            Try again
          </button>
          <Link href="/cart?payment=failed" className={`${ui.button} ${ui.secondary}`}>
            Back to cart
          </Link>
        </div>
      </div>
    );
  } else if (status === "expired" || (remaining !== null && remaining <= 0)) {
    body = (
      <div className={styles.result}>
        <h2>This payment request has expired</h2>
        <p className={ui.muted}>No money was taken. Go back to the cart to try again.</p>
        <Link href="/cart?payment=cancelled" className={ui.button}>
          Back to cart
        </Link>
      </div>
    );
  } else if (status === "processing") {
    body = (
      <div className={styles.result}>
        <div className={styles.spinner} aria-hidden />
        <h2>Your bank is confirming the payment…</h2>
        <p className={ui.muted}>This can take a little while. Please don&apos;t close this page.</p>
      </div>
    );
  } else if (waiting) {
    body = (
      <div className={styles.result}>
        <div className={styles.spinner} aria-hidden />
        <h2>{waiting}</h2>
        <p className={ui.muted}>
          Open your UPI app, check the amount and enter your UPI PIN. This page updates by itself.
        </p>
        <p className={styles.countdown}>Request expires in {remaining !== null ? formatCountdown(remaining) : "…"}</p>
        <div className={styles.row}>
          <a href={appPath} target="_blank" rel="noopener" className={ui.button}>
            Open the Test UPI app
          </a>
          <Link href="/cart?payment=cancelled" className={`${ui.button} ${ui.secondary}`}>
            Cancel payment
          </Link>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <section className={styles.option}>
          <h2 className={styles.optionTitle}>Scan and pay</h2>
          <div className={styles.qrRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="UPI QR code" className={styles.qr} />
            <p className={ui.muted}>
              Scan with any UPI app. In this simulator the QR opens the Test UPI app. On a phone it only works if the
              phone can reach this computer.
            </p>
          </div>
        </section>

        <section className={styles.option}>
          <h2 className={styles.optionTitle}>Pay with a UPI app</h2>
          <div className={styles.apps}>
            {UPI_APPS.map((name) => (
              <button key={name} type="button" className={`${ui.button} ${ui.secondary}`} onClick={() => openApp(name)}>
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.option}>
          <h2 className={styles.optionTitle}>Pay with UPI ID</h2>
          <form className={styles.row} onSubmit={sendCollectRequest}>
            <input
              className={ui.input}
              value={customerVpa}
              onChange={(event) => setCustomerVpa(event.target.value)}
              placeholder="yourname@okaxis"
              aria-label="Your UPI ID"
            />
            <button type="submit" className={ui.button}>
              Verify and pay
            </button>
          </form>
          {vpaError && <p className={`${ui.message} ${ui.error}`}>{vpaError}</p>}
        </section>

        <Link href="/cart?payment=cancelled" className={styles.cancel}>
          Cancel and go back to the shop
        </Link>
      </>
    );
  }

  return (
    <main className={styles.page}>
      <div className={`${ui.card} ${styles.card}`}>
        <p className={styles.banner}>UPI Simulator · pretend payment, no real money moves</p>
        {header}
        {body}
      </div>
    </main>
  );
}
