"use client";

import { useEffect, useState } from "react";
import ui from "@/components/ui/ui.module.scss";

const POLL_MS = 1500;
const RETURN_DELAY_SECONDS = 3;

export function ReturnToMerchant({ orderId, shopName }: { orderId: string; shopName: string }) {
  const [target, setTarget] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(RETURN_DELAY_SECONDS);

  useEffect(() => {
    if (target) return;
    let stopped = false;
    async function poll() {
      try {
        const response = await fetch(`/pay/test/${orderId}/status`, { cache: "no-store" });
        const state = (await response.json()) as { status: string; redirectUrl?: string | null };
        if (!stopped && state.status === "captured" && state.redirectUrl) setTarget(state.redirectUrl);
      } catch {}
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orderId, target]);

  useEffect(() => {
    if (!target) return;
    const timer = setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [target]);

  useEffect(() => {
    if (target && seconds <= 0) window.location.assign(target);
  }, [target, seconds]);

  if (!target) return null;

  return (
    <div className={`${ui.message} ${ui.success}`} role="status">
      Taking you back to {shopName} in {Math.max(seconds, 0)}…{" "}
      <a href={target}>Go now</a>
    </div>
  );
}
