"use client";

import { useState } from "react";
import ui from "@/components/ui/ui.module.scss";
import styles from "./AdminShell.module.scss";

export type VariantRow = { id?: string; label: string; price: string; stock: string };

const EXAMPLE_ROWS: VariantRow[] = [
  { label: "250 g", price: "", stock: "10" },
  { label: "500 g", price: "", stock: "10" },
  { label: "1 kg", price: "", stock: "10" },
];

export function VariantsEditor({ initial }: { initial: VariantRow[] }) {
  const [enabled, setEnabled] = useState(initial.length > 0);
  const [rows, setRows] = useState<VariantRow[]>(initial.length ? initial : EXAMPLE_ROWS);

  const update = (index: number, field: keyof VariantRow, value: string) =>
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));

  return (
    <fieldset className={ui.form}>
      <label className={ui.checkbox}>
        <input type="checkbox" name="hasVariants" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        This product comes in different pack sizes (e.g. 250 g, 500 g, 1 kg)
      </label>
      {enabled && (
        <>
          <input type="hidden" name="variants" value={JSON.stringify(rows)} />
          <div className={styles.variantHead}>
            <span>Pack size</span>
            <span>Price (₹)</span>
            <span>Stock</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div key={row.id ?? `new-${index}`} className={styles.variantRow}>
              <input
                className={ui.input}
                value={row.label}
                onChange={(event) => update(index, "label", event.target.value)}
                placeholder="250 g"
                aria-label="Pack size"
                maxLength={40}
              />
              <input
                className={ui.input}
                value={row.price}
                onChange={(event) => update(index, "price", event.target.value)}
                type="number"
                min="1"
                step="0.01"
                aria-label={`Price for ${row.label || "this pack"}`}
              />
              <input
                className={ui.input}
                value={row.stock}
                onChange={(event) => update(index, "stock", event.target.value)}
                type="number"
                min="0"
                step="1"
                aria-label={`Stock for ${row.label || "this pack"}`}
              />
              <button
                type="button"
                className={`${ui.button} ${ui.secondary} ${ui.small}`}
                onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                disabled={rows.length === 1}
                aria-label="Remove pack size"
              >
                ×
              </button>
            </div>
          ))}
          <div>
            <button
              type="button"
              className={`${ui.button} ${ui.secondary} ${ui.small}`}
              onClick={() => setRows((current) => [...current, { label: "", price: "", stock: "10" }])}
              disabled={rows.length >= 10}
            >
              Add pack size
            </button>
          </div>
        </>
      )}
    </fieldset>
  );
}
