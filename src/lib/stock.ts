export const STOCK_UNITS = {
  g: { small: "g", big: "kg", noun: "weight" },
  ml: { small: "ml", big: "L", noun: "volume" },
} as const;

export type StockUnit = keyof typeof STOCK_UNITS;

export const LOW_STOCK_PACKS = 5;

export function isStockUnit(value: unknown): value is StockUnit {
  return typeof value === "string" && value in STOCK_UNITS;
}

type StockProduct = { stock: number; stockUnit: string | null };
type StockVariant = { stock: number; packAmount: number | null };

export function packsFromStock(total: number, packAmount: number | null) {
  return packAmount && packAmount > 0 ? Math.max(0, Math.floor(total / packAmount)) : 0;
}

export function variantStock(product: StockProduct, variant: StockVariant) {
  return isStockUnit(product.stockUnit) ? packsFromStock(product.stock, variant.packAmount) : variant.stock;
}

export function productStock(product: StockProduct & { variants: StockVariant[] }) {
  if (!product.variants.length) return product.stock;
  return product.variants.reduce((sum, variant) => sum + variantStock(product, variant), 0);
}

export function formatStockAmount(amount: number, unit: StockUnit) {
  const { small, big } = STOCK_UNITS[unit];
  if (amount < 1000) return `${amount} ${small}`;
  return `${Number((amount / 1000).toFixed(2))} ${big}`;
}

const AMOUNT_PATTERN = /(\d+(?:\.\d+)?)\s*(kg|kilo|g|gm|gms|gram|grams|l|ltr|litre|liter|ml)\b/i;

export function parsePackAmount(label: string, unit: StockUnit) {
  const match = AMOUNT_PATTERN.exec(label);
  if (!match) return null;
  const value = Number(match[1]);
  const suffix = match[2].toLowerCase();
  const isWeight = ["kg", "kilo", "g", "gm", "gms", "gram", "grams"].includes(suffix);
  if (isWeight !== (unit === "g")) return null;
  const multiplier = ["kg", "kilo", "l", "ltr", "litre", "liter"].includes(suffix) ? 1000 : 1;
  return Math.round(value * multiplier) || null;
}
