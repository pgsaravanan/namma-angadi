import "dotenv/config";
import Database from "better-sqlite3";
import { db } from "../src/lib/db";

type Row = Record<string, unknown>;

const TABLES = [
  "User",
  "Shop",
  "Membership",
  "Category",
  "Product",
  "ProductVariant",
  "Coupon",
  "Customer",
  "CustomerAccount",
  "Order",
  "OrderItem",
  "Payment",
  "Refund",
  "ShopPolicy",
  "WebhookEvent",
  "SimulatedPayment",
  "OutboundEmail",
] as const;

const source = new Database(process.env.LEGACY_SQLITE_PATH ?? "prisma/legacy-sqlite/dev-backup.db", { readonly: true });
const shopFilter = process.argv.find((arg) => arg.startsWith("--shops="))?.slice("--shops=".length).split(",");

function columnTypes(table: string) {
  const info = source.prepare(`PRAGMA table_info("${table}")`).all() as { name: string; type: string }[];
  return new Map(info.map((column) => [column.name, column.type.toUpperCase()]));
}

function convert(table: string, rows: Row[]) {
  const types = columnTypes(table);
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        const type = types.get(key);
        if (value === null) return [key, null];
        if (type === "BOOLEAN") return [key, value === 1 || value === true];
        if (type === "DATETIME") return [key, new Date(typeof value === "number" ? value : String(value))];
        return [key, value];
      }),
    ),
  );
}

function delegate(table: string) {
  const name = table.charAt(0).toLowerCase() + table.slice(1);
  return (db as unknown as Record<string, { createMany: (args: { data: Row[]; skipDuplicates: boolean }) => Promise<{ count: number }> }>)[name];
}

async function main() {
  const shops = source.prepare(`SELECT id, slug FROM "Shop"`).all() as { id: string; slug: string }[];
  const keptShops = new Set(shops.filter((shop) => !shopFilter || shopFilter.includes(shop.slug)).map((shop) => shop.id));
  if (shopFilter && keptShops.size !== shopFilter.length) throw new Error(`Unknown shop in --shops=${shopFilter.join(",")}`);

  const memberUsers = new Set(
    (source.prepare(`SELECT userId, shopId FROM "Membership"`).all() as { userId: string; shopId: string }[])
      .filter((membership) => keptShops.has(membership.shopId))
      .map((membership) => membership.userId),
  );
  const kept: Record<string, Set<string>> = {};

  for (const table of TABLES) {
    let rows = source.prepare(`SELECT * FROM "${table}"`).all() as Row[];

    if (table === "User") rows = rows.filter((row) => row.isPlatformAdmin === 1 || memberUsers.has(String(row.id)));
    else if (table === "Shop") rows = rows.filter((row) => keptShops.has(String(row.id)));
    else if ("shopId" in (rows[0] ?? {})) rows = rows.filter((row) => row.shopId === null || keptShops.has(String(row.shopId)));

    if (table === "Membership") rows = rows.filter((row) => kept.User.has(String(row.userId)));
    if (table === "ProductVariant") rows = rows.filter((row) => kept.Product.has(String(row.productId)));
    if (["OrderItem", "Payment", "Refund"].includes(table)) rows = rows.filter((row) => kept.Order.has(String(row.orderId)));

    kept[table] = new Set(rows.map((row) => String(row.id)));
    if (!rows.length) {
      console.log(`${table}: 0`);
      continue;
    }
    const { count } = await delegate(table).createMany({ data: convert(table, rows), skipDuplicates: true });
    console.log(`${table}: ${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
