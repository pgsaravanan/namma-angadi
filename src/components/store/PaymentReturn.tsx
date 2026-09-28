"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ui from "@/components/ui/ui.module.scss";
import { useCart } from "./cart-store";
import { postJson } from "./payment-client";

type Props = { shopId: string; provider: string; token: string; payload: Record<string, string> };

export function PaymentReturn({ shopId, provider, token, payload }: Props) {
  const router = useRouter();
  const { clear } = useCart(shopId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    postJson("/api/checkout/verify", { provider, payload })
      .then(() => {
        if (cancelled) return;
        clear();
        router.replace(`/orders/${token}`);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [provider, payload, token, clear, router]);

  if (!failed) return <p className={ui.empty}>Confirming your payment…</p>;

  return (
    <div className={ui.empty}>
      <p>We couldn&apos;t confirm your payment yet. If money was taken, your order will update shortly.</p>
      <Link href={`/orders/${token}`} className={ui.button}>
        Check order status
      </Link>
    </div>
  );
}
