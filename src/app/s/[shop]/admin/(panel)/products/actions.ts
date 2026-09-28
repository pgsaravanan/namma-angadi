"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { GST_RATES, isFoodType } from "@/lib/food";
import { rupeesToPaise } from "@/lib/money";
import { deleteStoredImage, ImageUploadError, resolveImageField } from "@/lib/storage";

const MAX_VARIANTS = 10;

const variantSchema = z.object({
  id: z.string().max(40).optional(),
  label: z.string().trim().min(1, "Give every pack size a name, e.g. 250 g").max(40),
  price: z.coerce.number().min(1, "Every pack size needs a price of at least ₹1").max(10_00_000),
  stock: z.coerce.number().int("Stock must be a whole number").min(0).max(1_000_000),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(120),
  description: z.string().trim().max(2000),
  price: z.coerce.number().min(0).max(10_00_000, "Price is too high"),
  stock: z.coerce.number().int("Stock must be a whole number").min(0).max(1_000_000),
  isActive: z.boolean(),
  categoryId: z.string().max(40),
  foodType: z.string().max(10),
  hsnCode: z.string().trim().regex(/^(\d{4}|\d{6}|\d{8})?$/, "HSN code should be 4, 6 or 8 digits"),
  gstRate: z.string().refine((value) => value === "" || GST_RATES.includes(Number(value) as never), "Choose a GST rate"),
  variants: z.array(variantSchema).max(MAX_VARIANTS, `Up to ${MAX_VARIANTS} pack sizes`),
});

function parseVariants(raw: FormDataEntryValue | null) {
  try {
    const value = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function saveProduct(productId: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("products:manage");

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price") || 0,
    stock: formData.get("stock") || 0,
    isActive: formData.get("isActive") === "on",
    categoryId: formData.get("categoryId") ?? "",
    foodType: formData.get("foodType") ?? "",
    hsnCode: formData.get("hsnCode") ?? "",
    gstRate: formData.get("gstRate") ?? "",
    variants: formData.get("hasVariants") === "on" ? parseVariants(formData.get("variants")) : [],
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const input = parsed.data;
  if (formData.get("hasVariants") === "on" && input.variants.length === 0) return { error: "Add at least one pack size" };
  if (!input.variants.length && input.price < 1) return { error: "Price must be at least ₹1" };

  const existing = productId
    ? await db.product.findFirst({ where: { id: productId, shopId: shop.id }, include: { variants: true } })
    : null;
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

  const categoryId = input.categoryId
    ? ((await db.category.findFirst({ where: { id: input.categoryId, shopId: shop.id } }))?.id ?? null)
    : null;

  const variants = input.variants.map((variant, position) => ({
    id: variant.id,
    label: variant.label,
    pricePaise: rupeesToPaise(variant.price),
    stock: variant.stock,
    position,
  }));

  const data = {
    name: input.name,
    description: input.description,
    isActive: input.isActive,
    imageUrl,
    categoryId,
    foodType: isFoodType(input.foodType) ? input.foodType : null,
    hsnCode: input.hsnCode || null,
    gstRate: input.gstRate === "" ? null : Number(input.gstRate),
    pricePaise: variants.length ? Math.min(...variants.map((variant) => variant.pricePaise)) : rupeesToPaise(input.price),
    stock: variants.length ? variants.reduce((sum, variant) => sum + variant.stock, 0) : input.stock,
  };

  await db.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data })
      : await tx.product.create({ data: { ...data, shopId: shop.id } });

    const keepIds = new Set(variants.map((variant) => variant.id).filter(Boolean));
    const ownIds = new Set(existing?.variants.map((variant) => variant.id));
    await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: [...keepIds] as string[] } } });

    for (const { id, ...variant } of variants) {
      if (id && ownIds.has(id)) await tx.productVariant.update({ where: { id }, data: variant });
      else await tx.productVariant.create({ data: { ...variant, productId: product.id } });
    }
  });

  if (existing && existing.imageUrl !== imageUrl) await deleteStoredImage(existing.imageUrl);

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
