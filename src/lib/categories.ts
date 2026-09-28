import "server-only";
import { db } from "./db";

type Client = Pick<typeof db, "category">;

export function normaliseCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 60);
}

export async function findOrCreateCategory(shopId: string, rawName: string, client: Client = db) {
  const name = normaliseCategoryName(rawName);
  if (!name) return null;

  const categories = await client.category.findMany({ where: { shopId }, select: { id: true, name: true } });
  const match = categories.find((category) => category.name.toLowerCase() === name.toLowerCase());
  if (match) return match.id;

  const created = await client.category.create({ data: { shopId, name, position: categories.length } });
  return created.id;
}

export function listCategories(shopId: string) {
  return db.category.findMany({ where: { shopId }, orderBy: [{ position: "asc" }, { name: "asc" }] });
}
