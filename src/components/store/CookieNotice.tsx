"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import ui from "@/components/ui/ui.module.scss";
import styles from "./CookieNotice.module.scss";

const NOTICE_KEY = "cookie-notice-seen";

function seenBefore() {
  try {
    return Boolean(window.localStorage.getItem(NOTICE_KEY));
  } catch {
    return false;
  }
}

const noSubscription = () => () => {};

export function CookieNotice() {
  const seen = useSyncExternalStore(noSubscription, seenBefore, () => true);
  const [dismissed, setDismissed] = useState(false);

  if (seen || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(NOTICE_KEY, new Date().toISOString());
    } catch {}
  };

  return (
    <div className={styles.notice} role="region" aria-label="Cookies notice">
      <p>
        We use only essential cookies to keep you signed in and remember your bag and delivery details. No tracking or
        ads. <Link href="/policies/privacy">Privacy policy</Link>
      </p>
      <button type="button" className={`${ui.button} ${ui.small}`} onClick={dismiss}>
        OK
      </button>
    </div>
  );
}
