"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requirePlatformAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isValidSlug } from "@/lib/host";
import { inviteToShop, resendInvite } from "@/lib/invites";

const shopSchema = z.object({
  name: z.string().trim().min(2, "Enter the shop name").max(80),
  slug: z.string().trim().toLowerCase().refine(isValidSlug, "Use 3 to 40 lowercase letters, numbers or hyphens"),
  ownerName: z.string().trim().min(2, "Enter the owner's name").max(80),
  ownerEmail: z.email("Enter a valid owner email").trim().toLowerCase(),
});

export async function createShop(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requirePlatformAdmin();
  const parsed = shopSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { name, slug, ownerName, ownerEmail } = parsed.data;
  if (await db.shop.findUnique({ where: { slug } })) return { error: `The address ${slug} is already taken` };

  const shop = await db.shop.create({ data: { name, slug } });
  const result = await inviteToShop({
    shop,
    name: ownerName,
    email: ownerEmail,
    role: "SUPER_ADMIN",
    invitedBy: admin.name,
    byPlatformAdmin: true,
  });

  revalidatePath("/platform");
  if (result.status === "invited") {
    return {
      success: `${name} created. We've emailed ${ownerEmail} an invite. You can also send them this link (valid 7 days):`,
      link: result.link ?? undefined,
    };
  }
  return { success: `${name} created. ${ownerEmail} already had a login and is now the super admin.` };
}

export async function newOwnerInvite(shopId: string, userId: string): Promise<FormState> {
  const admin = await requirePlatformAdmin();
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  const result = shop && (await resendInvite(shop, userId, admin.name, true));
  return result?.link
    ? { success: "New invite link (the old one no longer works):", link: result.link }
    : { error: "This owner has already set their password" };
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

export async function setSenderEmail(shopId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requirePlatformAdmin();
  const raw = String(formData.get("senderEmail") ?? "").trim().toLowerCase();
  const parsed = z.union([z.email("Enter a valid email"), z.literal("")]).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await db.shop.update({ where: { id: shopId }, data: { senderEmail: parsed.data || null } });
  revalidatePath("/platform");
  return {
    success: parsed.data
      ? "Saved. Make sure this address is a verified sender in Brevo; until then emails use the default sender."
      : "This shop now uses the default sender",
  };
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
