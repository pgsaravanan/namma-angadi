"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPolicySlug, POLICIES } from "@/lib/policies";

const policySchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(80),
  body: z.string().trim().min(20, "The policy text is too short").max(20_000),
});

export async function savePolicy(slug: string, _: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("settings:manage");
  if (!isPolicySlug(slug)) return { error: "Unknown policy" };
  const parsed = policySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await db.shopPolicy.upsert({
    where: { shopId_slug: { shopId: shop.id, slug } },
    create: { shopId: shop.id, slug, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath(`/policies/${slug}`);
  return { success: `${POLICIES.find((policy) => policy.slug === slug)?.title} saved` };
}

export async function resetPolicy(slug: string) {
  const { shop } = await requireShopPermission("settings:manage");
  if (!isPolicySlug(slug)) return;
  await db.shopPolicy.deleteMany({ where: { shopId: shop.id, slug } });
  revalidatePath("/admin/policies");
}
