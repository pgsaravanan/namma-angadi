"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requirePlatformAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isValidSlug } from "@/lib/host";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

const shopSchema = z.object({
  name: z.string().trim().min(2, "Enter the shop name").max(80),
  slug: z.string().trim().toLowerCase().refine(isValidSlug, "Use 3 to 40 lowercase letters, numbers or hyphens"),
  ownerName: z.string().trim().min(2, "Enter the owner's name").max(80),
  ownerEmail: z.email("Enter a valid owner email").trim().toLowerCase(),
  ownerPassword: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
});

export async function createShop(_: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  const parsed = shopSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { name, slug, ownerName, ownerEmail, ownerPassword } = parsed.data;
  if (await db.shop.findUnique({ where: { slug } })) return { error: `The address ${slug} is already taken` };

  const existingOwner = await db.user.findUnique({ where: { email: ownerEmail } });
  const passwordHash = existingOwner ? null : await hashPassword(ownerPassword);

  await db.$transaction(async (tx) => {
    const owner =
      existingOwner ?? (await tx.user.create({ data: { name: ownerName, email: ownerEmail, passwordHash: passwordHash! } }));
    const shop = await tx.shop.create({ data: { name, slug } });
    await tx.membership.create({ data: { shopId: shop.id, userId: owner.id, role: "SUPER_ADMIN" } });
  });

  revalidatePath("/platform");
  return {
    success: existingOwner
      ? `${name} created. ${ownerEmail} already had an account and is now the super admin.`
      : `${name} created. The owner can sign in at the shop's /admin page.`,
  };
}

export async function toggleShopStatus(shopId: string) {
  await requirePlatformAdmin();
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;
  await db.shop.update({
    where: { id: shop.id },
    data: { status: shop.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" },
  });
  revalidatePath("/platform");
}

const DOMAIN_PATTERN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export async function setCustomDomain(shopId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  const domain = String(formData.get("domain") ?? "").trim().toLowerCase();
  const rootHost = env.rootDomain.split(":")[0];

  if (domain && (!DOMAIN_PATTERN.test(domain) || domain === rootHost || domain.endsWith(`.${rootHost}`))) {
    return { error: "Enter a domain like www.ravitextiles.com" };
  }
  if (domain) {
    const taken = await db.shop.findFirst({ where: { customDomain: domain, NOT: { id: shopId } } });
    if (taken) return { error: "That domain is used by another shop" };
  }

  await db.shop.update({ where: { id: shopId }, data: { customDomain: domain || null } });
  revalidatePath("/platform");
  return { success: domain ? "Domain saved. Point its DNS to the platform to go live." : "Custom domain removed" };
}
