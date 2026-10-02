"use client";

import { useState } from "react";
import ui from "@/components/ui/ui.module.scss";
import { packsFromStock, parsePackAmount, STOCK_UNITS, type StockUnit } from "@/lib/stock";
import styles from "./AdminShell.module.scss";

export type VariantRow = { id?: string; label: string; price: string; stock: string; packAmount: string };

export type SharedStock = { unit: StockUnit; total: number };

const EXAMPLE_ROWS: VariantRow[] = [
  { label: "250 g", price: "", stock: "10", packAmount: "250" },
  { label: "500 g", price: "", stock: "10", packAmount: "500" },
  { label: "1 kg", price: "", stock: "10", packAmount: "1000" },
];

export function VariantsEditor({ initial, shared }: { initial: VariantRow[]; shared: SharedStock | null }) {
  const [enabled, setEnabled] = useState(initial.length > 0);
  const [rows, setRows] = useState<VariantRow[]>(initial.length ? initial : EXAMPLE_ROWS);
  const [isShared, setIsShared] = useState(shared !== null);
  const [unit, setUnit] = useState<StockUnit>(shared?.unit ?? "g");
  const [totalIn, setTotalIn] = useState<"big" | "small">("big");
  const [total, setTotal] = useState(shared ? String(shared.total / 1000) : "");

  const names = STOCK_UNITS[unit];
  const totalBase = Math.round((Number(total) || 0) * (totalIn === "big" ? 1000 : 1));

  const update = (index: number, field: keyof VariantRow, value: string) =>
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, [field]: value };
        if (field === "label") {
          const previous = parsePackAmount(row.label, unit);
          const parsed = parsePackAmount(value, unit);
          if (parsed && (!row.packAmount || Number(row.packAmount) === previous)) next.packAmount = String(parsed);
        }
        return next;
      }),
    );

  const changeUnit = (value: StockUnit) => {
    setUnit(value);
    setRows((current) =>
      current.map((row) => ({ ...row, packAmount: String(parsePackAmount(row.label, value) ?? row.packAmount) })),
    );
  };

  return (
    <fieldset className={ui.form}>
      <label className={ui.checkbox}>
        <input type="checkbox" name="hasVariants" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        This product comes in different pack sizes (e.g. 250 g, 500 g, 1 kg)
      </label>
      {enabled && (
        <>
          <input type="hidden" name="variants" value={JSON.stringify(rows)} />
          <label className={ui.checkbox}>
            <input
              type="checkbox"
              name="sharedStock"
              checked={isShared}
              onChange={(event) => setIsShared(event.target.checked)}
            />
            All pack sizes come from one stock (I have e.g. 10 kg in total)
          </label>

          {isShared && (
            <div className={ui.row}>
              <label className={ui.field}>
                <span className={ui.label}>Sold by</span>
                <select
                  className={ui.input}
                  name="stockUnit"
                  value={unit}
                  onChange={(event) => changeUnit(event.target.value as StockUnit)}
                >
                  <option value="g">Weight (kg / g)</option>
                  <option value="ml">Volume (L / ml)</option>
                </select>
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Total stock</span>
                <div className={styles.inlineForm}>
                  <input
                    className={ui.input}
                    name="totalStock"
                    type="number"
                    min="0"
                    step="any"
                    value={total}
                    onChange={(event) => setTotal(event.target.value)}
                    aria-label="Total stock"
                  />
                  <select
                    className={ui.input}
                    name="totalStockIn"
                    value={totalIn}
                    onChange={(event) => setTotalIn(event.target.value as "big" | "small")}
                    aria-label="Total stock unit"
                  >
                    <option value="big">{names.big}</option>
                    <option value="small">{names.small}</option>
                  </select>
                </div>
                <span className={ui.hint}>Every order takes its pack size out of this total.</span>
              </label>
            </div>
          )}

          <div className={styles.variantHead}>
            <span>Pack size</span>
            <span>Price (₹)</span>
            <span>{isShared ? `Pack ${names.noun} (${names.small})` : "Stock"}</span>
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
              {isShared ? (
                <div>
                  <input
                    className={ui.input}
                    value={row.packAmount}
                    onChange={(event) => update(index, "packAmount", event.target.value)}
                    type="number"
                    min="1"
                    step="1"
                    aria-label={`${names.noun} of ${row.label || "this pack"} in ${names.small}`}
                  />
                  <span className={ui.hint}>
                    {Number(row.packAmount) > 0 ? `${packsFromStock(totalBase, Number(row.packAmount))} available` : " "}
                  </span>
                </div>
              ) : (
                <input
                  className={ui.input}
                  value={row.stock}
                  onChange={(event) => update(index, "stock", event.target.value)}
                  type="number"
                  min="0"
                  step="1"
                  aria-label={`Stock for ${row.label || "this pack"}`}
                />
              )}
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
              onClick={() => setRows((current) => [...current, { label: "", price: "", stock: "10", packAmount: "" }])}
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
