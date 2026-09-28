"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import type { commitImport, ImportState, previewImport } from "@/app/s/[shop]/admin/(panel)/products/import/actions";
import { toCsv } from "@/lib/csv";
import { formatPaise } from "@/lib/money";
import { TEMPLATE_ROWS } from "@/lib/product-import";
import styles from "./AdminShell.module.scss";

type Props = { preview: typeof previewImport; commit: typeof commitImport };

const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(TEMPLATE_ROWS))}`;

export function ProductImport({ preview, commit }: Props) {
  const [previewState, previewAction] = useActionState(preview, { step: "start" } as ImportState);
  const [commitState, commitAction] = useActionState(commit, { step: "start" } as ImportState);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [restarted, setRestarted] = useState<ImportState | null>(null);

  if (commitState.step === "done") {
    return (
      <section className={ui.card}>
        <p className={`${ui.message} ${ui.success}`}>
          Import finished: {commitState.created} added, {commitState.updated} updated, {commitState.skipped} skipped.
        </p>
        <div className={styles.actions}>
          <Link href="/admin/products" className={ui.button}>
            View products
          </Link>
        </div>
      </section>
    );
  }

  if (previewState.step === "preview" && restarted !== previewState) {
    const newCount = previewState.rows.filter((row) => !row.existingId).length;
    const duplicateCount = previewState.rows.length - newCount;
    const importCount = updateExisting ? previewState.rows.length : newCount;
    const rows = previewState.rows.map(({ name, category, description, pricePaise, stock, imageUrl, isActive }) => ({
      name,
      category,
      description,
      pricePaise,
      stock,
      imageUrl,
      isActive,
    }));

    return (
      <section className={`${ui.card} ${ui.form}`}>
        <h2 className={styles.cardTitle}>
          Check before importing: {newCount} new
          {duplicateCount > 0 && `, ${duplicateCount} already in your shop`}
        </h2>
        {previewState.issues.length > 0 && (
          <div className={`${ui.message} ${ui.error}`}>
            {previewState.issues.length} row{previewState.issues.length > 1 && "s"} will be left out:
            <ul>
              {previewState.issues.slice(0, 10).map((issue) => (
                <li key={issue.line}>
                  Row {issue.line}: {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Row</th>
                <th />
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Visible</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {previewState.rows.map((row) => (
                <tr key={row.line}>
                  <td className={ui.muted}>{row.line}</td>
                  <td>
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.imageUrl} alt="" className={styles.thumb} />
                    ) : (
                      <span className={styles.thumb} />
                    )}
                  </td>
                  <td>
                    {row.name}
                    {row.category && <div className={ui.hint}>{row.category}</div>}
                    {row.description && <div className={ui.hint}>{row.description.slice(0, 80)}</div>}
                  </td>
                  <td>{formatPaise(row.pricePaise)}</td>
                  <td>{row.stock}</td>
                  <td>{row.isActive ? "Yes" : "Hidden"}</td>
                  <td>{row.existingId ? <span className={ui.hint}>Already exists</span> : "New"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={commitAction} className={ui.form}>
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          {duplicateCount > 0 && (
            <label className={ui.checkbox}>
              <input
                type="checkbox"
                name="updateExisting"
                checked={updateExisting}
                onChange={(event) => setUpdateExisting(event.target.checked)}
              />
              Update the {duplicateCount} existing product{duplicateCount > 1 && "s"} with these prices and details
              (otherwise they are skipped)
            </label>
          )}
          {commitState.step === "start" && commitState.error && (
            <p className={`${ui.message} ${ui.error}`}>{commitState.error}</p>
          )}
          <div className={styles.actions}>
            <SubmitButton pendingText="Importing…">
              Import {importCount} product{importCount === 1 ? "" : "s"}
            </SubmitButton>
            <button type="button" className={`${ui.button} ${ui.secondary}`} onClick={() => setRestarted(previewState)}>
              Choose a different file
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className={`${ui.card} ${ui.form}`}>
      <ol className={ui.muted}>
        <li>
          <a href={TEMPLATE_HREF} download="products-template.csv">
            Download the template
          </a>{" "}
          and fill it in (Excel or Google Sheets → save or download as CSV).
        </li>
        <li>A Meta Commerce Manager catalog export (CSV) works as it is.</li>
        <li>You will see a preview before anything is saved.</li>
      </ol>
      <form action={previewAction} className={ui.form}>
        <label className={ui.field}>
          <span className={ui.label}>CSV file</span>
          <input className={ui.input} name="file" type="file" accept=".csv,text/csv" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Or paste the rows</span>
          <textarea className={ui.input} name="pasted" placeholder={toCsv(TEMPLATE_ROWS.slice(0, 2))} />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Stock for rows without a stock number</span>
          <input className={ui.input} name="defaultStock" type="number" min="0" defaultValue="10" />
        </label>
        {previewState.step === "start" && previewState.error && (
          <p className={`${ui.message} ${ui.error}`}>{previewState.error}</p>
        )}
        <div>
          <SubmitButton pendingText="Reading…">Preview import</SubmitButton>
        </div>
      </form>
    </section>
  );
}
