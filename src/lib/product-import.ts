import { z } from "zod";
import { parseCsv } from "./csv";

export const MAX_IMPORT_ROWS = 500;

export const TEMPLATE_ROWS = [
  ["name", "category", "description", "price", "stock", "image_url", "visible"],
  ["Murukku (250 g)", "Snacks", "Crunchy rice flour murukku made fresh every week.", "120", "25", "", "yes"],
  ["Adhirasam (pack of 6)", "Sweets", "Traditional jaggery sweet.", "180", "10", "", "yes"],
];

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "title", "product", "product name", "item", "item name"],
  description: ["description", "details", "desc"],
  price: ["price", "selling price", "sale price", "mrp", "amount", "rate"],
  stock: ["stock", "quantity", "qty", "inventory", "quantity to sell on facebook"],
  imageUrl: ["image_url", "image url", "image", "image_link", "image link", "photo", "photo url"],
  visible: ["visible", "active", "show", "availability", "status"],
  category: ["category", "collection", "product type", "product_type", "section"],
};

export const importRowSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long"),
  pricePaise: z.number().int().min(100, "Price must be at least ₹1").max(10_00_000_00, "Price is too high"),
  stock: z.number().int().min(0).max(1_000_000),
  imageUrl: z.union([z.url({ protocol: /^https$/ }), z.null()]),
  isActive: z.boolean(),
  category: z.string().trim().max(60, "Category name is too long"),
});

export type ImportRow = z.infer<typeof importRowSchema>;

export type ImportIssue = { line: number; message: string };

function normalise(header: string) {
  return header.trim().toLowerCase().replace(/[_\s]+/g, " ");
}

function findColumns(headers: string[]) {
  const normalised = headers.map(normalise);
  return Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      normalised.findIndex((header) => aliases.map(normalise).includes(header)),
    ]),
  ) as Record<keyof typeof HEADER_ALIASES, number>;
}

export function parsePriceToPaise(value: string) {
  const cleaned = value.replace(/inr|rs\.?|₹|,|\s/gi, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

function parseVisible(value: string | undefined) {
  if (value === undefined || value.trim() === "") return { isActive: true, outOfStock: false };
  const text = value.trim().toLowerCase();
  if (["out of stock", "discontinued"].includes(text)) return { isActive: true, outOfStock: true };
  return { isActive: !["no", "false", "0", "hidden", "inactive", "archived"].includes(text), outOfStock: false };
}

export function readProductCsv(text: string, defaultStock: number) {
  const rows = parseCsv(text);
  const issues: ImportIssue[] = [];
  const products: (ImportRow & { line: number })[] = [];

  if (rows.length < 2) return { products, issues: [{ line: 1, message: "The file has no product rows" }] };

  const columns = findColumns(rows[0]);
  if (columns.name === -1 || columns.price === -1) {
    return { products, issues: [{ line: 1, message: "The first row must include name (or title) and price columns" }] };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return { products, issues: [{ line: 1, message: `Import up to ${MAX_IMPORT_ROWS} products at a time` }] };
  }

  dataRows.forEach((cells, index) => {
    const line = index + 2;
    const cell = (column: number) => (column === -1 ? undefined : cells[column]?.trim());

    const pricePaise = parsePriceToPaise(cell(columns.price) ?? "");
    if (pricePaise === null) {
      issues.push({ line, message: `Price "${cell(columns.price) ?? ""}" is not a number` });
      return;
    }

    const visible = parseVisible(cell(columns.visible));
    const stockText = cell(columns.stock);
    const stock = visible.outOfStock ? 0 : stockText ? Number(stockText) : defaultStock;

    const parsed = importRowSchema.safeParse({
      name: cell(columns.name) ?? "",
      description: cell(columns.description) ?? "",
      pricePaise,
      stock,
      imageUrl: cell(columns.imageUrl) || null,
      isActive: visible.isActive,
      category: cell(columns.category) ?? "",
    });

    if (parsed.success) products.push({ ...parsed.data, line });
    else issues.push({ line, message: parsed.error.issues[0]?.message ?? "Invalid row" });
  });

  return { products, issues };
}
