"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPaise } from "@/lib/money";
import styles from "./NewOrderAlert.module.scss";

type Snapshot = {
  latest: { id: string; number: number; totalPaise: number; customerName: string } | null;
  toPrepare: number;
};

const POLL_MS = 20_000;

function chime() {
  try {
    const context = new AudioContext();
    [880, 1320].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + index * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.18 + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.18);
      oscillator.stop(context.currentTime + index * 0.18 + 0.4);
    });
  } catch {}
}

export function NewOrderAlert({ initial }: { initial: Snapshot }) {
  const seenNumber = useRef(initial.latest?.number ?? 0);
  const [fresh, setFresh] = useState<Snapshot["latest"]>(null);
  const [toPrepare, setToPrepare] = useState(initial.toPrepare);

  useEffect(() => {
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = toPrepare > 0 ? `(${toPrepare}) ${baseTitle}` : baseTitle;
  }, [toPrepare]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/admin/api/new-orders", { cache: "no-store" });
        if (!response.ok) return;
        const snapshot = (await response.json()) as Snapshot;
        setToPrepare(snapshot.toPrepare);
        if (snapshot.latest && snapshot.latest.number > seenNumber.current) {
          seenNumber.current = snapshot.latest.number;
          setFresh(snapshot.latest);
          chime();
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  if (!fresh) return null;

  return (
    <div className={styles.toast} role="alert">
      <div>
        <strong>New order #{fresh.number}</strong>
        <span>
          {fresh.customerName} · {formatPaise(fresh.totalPaise)}
        </span>
      </div>
      <Link href={`/admin/orders/${fresh.id}`} className={styles.open} onClick={() => setFresh(null)}>
        Open
      </Link>
      <button type="button" className={styles.close} onClick={() => setFresh(null)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
