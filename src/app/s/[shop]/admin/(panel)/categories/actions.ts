"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { normaliseCategoryName } from "@/lib/categories";
import { db } from "@/lib/db";
import { deleteStoredImage, ImageUploadError, resolveImageField } from "@/lib/storage";

const nameSchema = z
  .string()
  .transform(normaliseCategoryName)
  .pipe(z.string().min(2, "Category name is too short").max(60));

function refresh() {
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
}

async function nameTaken(shopId: string, name: string, exceptId?: string) {
  const categories = await db.category.findMany({ where: { shopId }, select: { id: true, name: true } });
  return categories.some((category) => category.id !== exceptId && category.name.toLowerCase() === name.toLowerCase());
}

export async function saveCategory(categoryId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("products:manage");
  const parsed = nameSchema.safeParse(String(formData.get("name") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = categoryId ? await db.category.findFirst({ where: { id: categoryId, shopId: shop.id } }) : null;
  if (categoryId && !existing) return { error: "Category not found" };
  if (await nameTaken(shop.id, parsed.data, existing?.id)) return { error: `You already have a "${parsed.data}" category` };

  let imageUrl: string | null;
  try {
    imageUrl = await resolveImageField(shop.id, formData, {
      current: existing?.imageUrl ?? null,
      field: "image",
      kind: "categories",
    });
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    throw error;
  }

  if (existing) {
    await db.category.update({ where: { id: existing.id }, data: { name: parsed.data, imageUrl } });
    if (existing.imageUrl !== imageUrl) await deleteStoredImage(existing.imageUrl);
  } else {
    const position = await db.category.count({ where: { shopId: shop.id } });
    await db.category.create({ data: { shopId: shop.id, name: parsed.data, imageUrl, position } });
  }

  refresh();
  return { success: existing ? "Category saved" : `Added "${parsed.data}"` };
}

export async function moveCategory(categoryId: string, direction: "up" | "down") {
  const { shop } = await requireShopPermission("products:manage");
  const categories = await db.category.findMany({
    where: { shopId: shop.id },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  const index = categories.findIndex((category) => category.id === categoryId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= categories.length) return;

  [categories[index], categories[target]] = [categories[target], categories[index]];
  await db.$transaction(
    categories.map((category, position) => db.category.update({ where: { id: category.id }, data: { position } })),
  );
  refresh();
}

export async function deleteCategory(categoryId: string) {
  const { shop } = await requireShopPermission("products:manage");
  const category = await db.category.findFirst({ where: { id: categoryId, shopId: shop.id } });
  if (!category) return;
  await db.category.delete({ where: { id: category.id } });
  await deleteStoredImage(category.imageUrl);
  refresh();
}
