"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireShopPermission } from "@/lib/auth";
import { findOrCreateCategory } from "@/lib/categories";
import { db } from "@/lib/db";
import { importRowSchema, MAX_IMPORT_ROWS, readProductCsv, type ImportIssue, type ImportRow } from "@/lib/product-import";

const MAX_CSV_BYTES = 1024 * 1024;

export type PreviewRow = ImportRow & { line: number; existingId: string | null };

export type ImportState =
  | { step: "start"; error?: string }
  | { step: "preview"; rows: PreviewRow[]; issues: ImportIssue[] }
  | { step: "done"; created: number; updated: number; skipped: number };

async function existingByName(shopId: string) {
  const products = await db.product.findMany({ where: { shopId }, select: { id: true, name: true } });
  return new Map(products.map((product) => [product.name.trim().toLowerCase(), product.id]));
}

export async function previewImport(_: ImportState, formData: FormData): Promise<ImportState> {
  const { shop } = await requireShopPermission("products:manage");

  const file = formData.get("file");
  let text = String(formData.get("pasted") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CSV_BYTES) return { step: "start", error: "The file is larger than 1 MB" };
    text = await file.text();
  }
  if (!text.trim()) return { step: "start", error: "Choose a CSV file or paste the rows" };

  const defaultStock = Math.max(0, Math.min(1_000_000, Math.floor(Number(formData.get("defaultStock")) || 0)));
  const { products, issues } = readProductCsv(text, defaultStock);
  if (!products.length && issues.length) return { step: "start", error: issues[0].message };

  const existing = await existingByName(shop.id);
  return {
    step: "preview",
    rows: products.map((product) => ({ ...product, existingId: existing.get(product.name.toLowerCase()) ?? null })),
    issues,
  };
}

const commitSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(MAX_IMPORT_ROWS),
  updateExisting: z.boolean(),
});

export async function commitImport(_: ImportState, formData: FormData): Promise<ImportState> {
  const { shop } = await requireShopPermission("products:manage");

  let payload: unknown;
  try {
    payload = { rows: JSON.parse(String(formData.get("rows") ?? "[]")), updateExisting: formData.get("updateExisting") === "on" };
  } catch {
    return { step: "start", error: "Something went wrong. Please preview the file again." };
  }
  const parsed = commitSchema.safeParse(payload);
  if (!parsed.success) return { step: "start", error: "Something went wrong. Please preview the file again." };

  const existing = await existingByName(shop.id);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  await db.$transaction(async (tx) => {
    for (const { category, ...row } of parsed.data.rows) {
      const matchId = existing.get(row.name.toLowerCase());
      if (matchId && !parsed.data.updateExisting) {
        skipped++;
        continue;
      }
      if (matchId) {
        const { imageUrl, ...fields } = row;
        const categoryId = category ? await findOrCreateCategory(shop.id, category, tx) : undefined;
        await tx.product.update({
          where: { id: matchId },
          data: { ...fields, ...(imageUrl && { imageUrl }), ...(categoryId && { categoryId }) },
        });
        updated++;
      } else {
        const categoryId = await findOrCreateCategory(shop.id, category, tx);
        const product = await tx.product.create({ data: { ...row, categoryId, shopId: shop.id } });
        existing.set(row.name.toLowerCase(), product.id);
        created++;
      }
    }
  });

  revalidatePath("/admin/products");
  return { step: "done", created, updated, skipped };
}
