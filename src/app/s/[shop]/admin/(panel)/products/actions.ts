"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";
import { deleteStoredImage, ImageUploadError, resolveImageField } from "@/lib/storage";

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(120),
  description: z.string().trim().max(2000),
  price: z.coerce.number().min(1, "Price must be at least ₹1").max(10_00_000, "Price is too high"),
  stock: z.coerce.number().int("Stock must be a whole number").min(0).max(1_000_000),
  isActive: z.boolean(),
  categoryId: z.string().max(40),
});

export async function saveProduct(productId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("products:manage");

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    stock: formData.get("stock"),
    isActive: formData.get("isActive") === "on",
    categoryId: formData.get("categoryId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = productId ? await db.product.findFirst({ where: { id: productId, shopId: shop.id } }) : null;
  if (productId && !existing) return { error: "Product not found" };

  let imageUrl: string | null;
  try {
    imageUrl = await resolveImageField(shop.id, formData, {
      current: existing?.imageUrl ?? null,
      field: "photo",
      kind: "products",
      allowLink: true,
    });
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    throw error;
  }

  const { name, description, stock, isActive, price } = parsed.data;
  const categoryId = parsed.data.categoryId
    ? ((await db.category.findFirst({ where: { id: parsed.data.categoryId, shopId: shop.id } }))?.id ?? null)
    : null;
  const data = { name, description, stock, isActive, imageUrl, categoryId, pricePaise: rupeesToPaise(price) };

  if (existing) {
    await db.product.update({ where: { id: existing.id }, data });
    if (existing.imageUrl !== imageUrl) await deleteStoredImage(existing.imageUrl);
  } else {
    await db.product.create({ data: { ...data, shopId: shop.id } });
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
