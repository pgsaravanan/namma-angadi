"use client";

import ui from "@/components/ui/ui.module.scss";

export function PrintButton() {
  return (
    <button type="button" className={ui.button} onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
