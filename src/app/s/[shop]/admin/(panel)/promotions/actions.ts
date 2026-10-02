"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPromotionKind, MAX_ANNOUNCEMENTS, MAX_PROMOTION_PRODUCTS, MAX_STORIES } from "@/lib/promotions";
import { deleteStoredImage, ImageUploadError, resolveMediaField } from "@/lib/storage";

const INDIA_OFFSET = "+05:30";

function refresh() {
  revalidatePath("/admin/promotions");
  revalidatePath("/", "layout");
}

const announcementSchema = z.object({
  message: z.string().trim().min(3, "Write a short message").max(120, "Keep the message under 120 characters"),
  link: z
    .string()
    .trim()
    .max(300)
    .refine(
      (value) => value === "" || (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\//.test(value),
      "Links should start with / or https://",
    ),
});

export async function addAnnouncement(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("marketing:manage");
  const parsed = announcementSchema.safeParse({ message: formData.get("message") ?? "", link: formData.get("link") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const count = await db.shopAnnouncement.count({ where: { shopId: shop.id } });
  if (count >= MAX_ANNOUNCEMENTS) return { error: `You can show up to ${MAX_ANNOUNCEMENTS} messages. Remove one first.` };

  const last = await db.shopAnnouncement.aggregate({ where: { shopId: shop.id }, _max: { position: true } });
  await db.shopAnnouncement.create({
    data: {
      shopId: shop.id,
      message: parsed.data.message,
      link: parsed.data.link || null,
      position: (last._max.position ?? -1) + 1,
    },
  });
  refresh();
  return { success: "Message added to the top banner" };
}

export async function removeAnnouncement(announcementId: string) {
  const { shop } = await requireShopPermission("marketing:manage");
  await db.shopAnnouncement.deleteMany({ where: { id: announcementId, shopId: shop.id } });
  refresh();
}

export async function moveAnnouncement(announcementId: string, direction: "up" | "down") {
  const { shop } = await requireShopPermission("marketing:manage");
  const list = await db.shopAnnouncement.findMany({
    where: { shopId: shop.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  const from = list.findIndex((item) => item.id === announcementId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= list.length) return;

  [list[from], list[to]] = [list[to], list[from]];
  await db.$transaction(
    list.map((item, position) => db.shopAnnouncement.update({ where: { id: item.id }, data: { position } })),
  );
  refresh();
}

const promotionSchema = z.object({
  kind: z.string().refine(isPromotionKind, "Choose what kind of promotion this is"),
  title: z.string().trim().min(3, "Give the promotion a headline").max(80, "Keep the headline under 80 characters"),
  subtitle: z.string().trim().max(160, "Keep the text under 160 characters"),
  couponId: z.string().max(40),
  endsAt: z.preprocess(
    (value) => (typeof value === "string" && value ? `${value}:00${INDIA_OFFSET}` : undefined),
    z.coerce.date().optional(),
  ),
  productIds: z
    .array(z.string().max(40))
    .min(1, "Pick at least one product to show")
    .max(MAX_PROMOTION_PRODUCTS, `Pick up to ${MAX_PROMOTION_PRODUCTS} products`),
});

async function readMedia(shopId: string, formData: FormData, kind: "promotions" | "stories", current: string | null) {
  try {
    return { mediaUrl: await resolveMediaField(shopId, formData, { current, field: "media", kind }) };
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    throw error;
  }
}

async function readPromotion(shopId: string, formData: FormData, currentMedia: string | null) {
  const parsed = promotionSchema.safeParse({
    kind: formData.get("kind") ?? "",
    title: formData.get("title") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    couponId: formData.get("couponId") ?? "",
    endsAt: formData.get("endsAt") ?? "",
    productIds: formData.getAll("productIds").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { kind, title, subtitle, couponId, endsAt, productIds } = parsed.data;
  if (endsAt && endsAt <= new Date()) return { error: "The end date should be in the future" };

  const [products, coupon] = await Promise.all([
    db.product.findMany({ where: { shopId, id: { in: productIds } }, select: { id: true } }),
    couponId ? db.coupon.findFirst({ where: { id: couponId, shopId }, select: { id: true } }) : null,
  ]);
  if (!products.length) return { error: "Pick at least one product to show" };

  const media = await readMedia(shopId, formData, "promotions", currentMedia);
  if ("error" in media) return { error: media.error };

  return {
    data: {
      kind,
      title,
      subtitle: subtitle || null,
      couponId: coupon?.id ?? null,
      endsAt: endsAt ?? null,
      mediaUrl: media.mediaUrl,
    },
    products,
  };
}

export async function createPromotion(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("marketing:manage");
  const result = await readPromotion(shop.id, formData, null);
  if ("error" in result) return { error: result.error };

  await db.promotion.create({ data: { ...result.data, shopId: shop.id, products: { connect: result.products } } });
  refresh();
  return { success: "Promotion is live on the home page" };
}

export async function updatePromotion(promotionId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("marketing:manage");
  const existing = await db.promotion.findFirst({
    where: { id: promotionId, shopId: shop.id },
    select: { id: true, mediaUrl: true },
  });
  if (!existing) return { error: "This promotion no longer exists" };

  const result = await readPromotion(shop.id, formData, existing.mediaUrl);
  if ("error" in result) return { error: result.error };

  await db.promotion.update({ where: { id: existing.id }, data: { ...result.data, products: { set: result.products } } });
  if (existing.mediaUrl !== result.data.mediaUrl) await deleteStoredImage(existing.mediaUrl);
  refresh();
  redirect("/admin/promotions");
}

export async function togglePromotion(promotionId: string) {
  const { shop } = await requireShopPermission("marketing:manage");
  const promotion = await db.promotion.findFirst({ where: { id: promotionId, shopId: shop.id } });
  if (!promotion) return;
  await db.promotion.update({ where: { id: promotion.id }, data: { isActive: !promotion.isActive } });
  refresh();
}

export async function deletePromotion(promotionId: string) {
  const { shop } = await requireShopPermission("marketing:manage");
  const promotion = await db.promotion.findFirst({ where: { id: promotionId, shopId: shop.id } });
  if (!promotion) return;
  await db.promotion.delete({ where: { id: promotion.id } });
  await deleteStoredImage(promotion.mediaUrl);
  refresh();
}

const storySchema = z.object({
  caption: z.string().trim().min(3, "Write a few words about this delivery").max(200, "Keep it under 200 characters"),
  customerName: z.string().trim().max(60, "Keep the name short"),
  place: z.string().trim().max(60, "Keep the place short"),
});

async function readStory(shopId: string, formData: FormData, currentMedia: string | null) {
  const parsed = storySchema.safeParse({
    caption: formData.get("caption") ?? "",
    customerName: formData.get("customerName") ?? "",
    place: formData.get("place") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const media = await readMedia(shopId, formData, "stories", currentMedia);
  if ("error" in media) return { error: media.error };

  const { caption, customerName, place } = parsed.data;
  return { data: { caption, customerName: customerName || null, place: place || null, mediaUrl: media.mediaUrl } };
}

export async function createStory(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("marketing:manage");
  const count = await db.customerStory.count({ where: { shopId: shop.id } });
  if (count >= MAX_STORIES) return { error: `You can keep up to ${MAX_STORIES} stories. Delete an older one first.` };

  const result = await readStory(shop.id, formData, null);
  if ("error" in result) return { error: result.error };

  const first = await db.customerStory.aggregate({ where: { shopId: shop.id }, _min: { position: true } });
  await db.customerStory.create({ data: { ...result.data, shopId: shop.id, position: (first._min.position ?? 1) - 1 } });
  refresh();
  return { success: "Added. It now shows on your home page." };
}

export async function updateStory(storyId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("marketing:manage");
  const existing = await db.customerStory.findFirst({ where: { id: storyId, shopId: shop.id } });
  if (!existing) return { error: "This story no longer exists" };

  const result = await readStory(shop.id, formData, existing.mediaUrl);
  if ("error" in result) return { error: result.error };

  await db.customerStory.update({ where: { id: existing.id }, data: result.data });
  if (existing.mediaUrl !== result.data.mediaUrl) await deleteStoredImage(existing.mediaUrl);
  refresh();
  redirect("/admin/promotions#stories");
}

export async function toggleStory(storyId: string) {
  const { shop } = await requireShopPermission("marketing:manage");
  const story = await db.customerStory.findFirst({ where: { id: storyId, shopId: shop.id } });
  if (!story) return;
  await db.customerStory.update({ where: { id: story.id }, data: { isActive: !story.isActive } });
  refresh();
}

export async function deleteStory(storyId: string) {
  const { shop } = await requireShopPermission("marketing:manage");
  const story = await db.customerStory.findFirst({ where: { id: storyId, shopId: shop.id } });
  if (!story) return;
  await db.customerStory.delete({ where: { id: story.id } });
  await deleteStoredImage(story.mediaUrl);
  refresh();
}
