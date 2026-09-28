"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 30;

export function OrderStatusPoller() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) clearInterval(timer);
      else router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
