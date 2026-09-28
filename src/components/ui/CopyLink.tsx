"use client";

import { useState } from "react";
import ui from "./ui.module.scss";

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={ui.copyLink}>
      <input className={ui.input} value={link} readOnly aria-label="Invite link" onFocus={(event) => event.target.select()} />
      <button
        type="button"
        className={`${ui.button} ${ui.secondary} ${ui.small}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
    </div>
  );
}
