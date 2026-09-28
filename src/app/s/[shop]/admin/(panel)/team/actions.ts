"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteToShop, resendInvite } from "@/lib/invites";

const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
});

export async function addMember(_: FormState, formData: FormData): Promise<FormState> {
  const { shop, staff } = await requireShopPermission("team:manage");
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await inviteToShop({
    shop,
    ...parsed.data,
    invitedBy: staff.user.name,
    byPlatformAdmin: staff.user.isPlatformAdmin,
  });
  revalidatePath("/admin/team");

  if (result.status === "already-member") return { error: `${parsed.data.email} is already in your team` };
  if (result.status === "added") {
    return { success: `${parsed.data.email} already had a login, so they can sign in now with their usual password.` };
  }
  if (!result.link) return { success: `Invite emailed to ${parsed.data.email}. The link works for 7 days.` };
  return {
    success: `Invite sent to ${parsed.data.email}. If it doesn't arrive, send them this link yourself (it works for 7 days):`,
    link: result.link,
  };
}

export async function newInviteLink(userId: string): Promise<FormState> {
  const { shop, staff } = await requireShopPermission("team:manage");
  const result = await resendInvite(shop, userId, staff.user.name, staff.user.isPlatformAdmin);
  if (!result) return { error: "This person has already set their password" };
  return result.link
    ? { success: "New invite link (the old one no longer works):", link: result.link }
    : { success: "We've emailed them a new invite link." };
}

export async function removeMember(membershipId: string) {
  const { shop, staff } = await requireShopPermission("team:manage");
  const membership = await db.membership.findFirst({ where: { id: membershipId, shopId: shop.id } });
  if (!membership || membership.userId === staff.user.id) return;

  if (membership.role === "SUPER_ADMIN") {
    const superAdmins = await db.membership.count({ where: { shopId: shop.id, role: "SUPER_ADMIN" } });
    if (superAdmins <= 1) return;
  }

  await db.$transaction([
    db.membership.delete({ where: { id: membership.id } }),
    db.session.deleteMany({ where: { userId: membership.userId, shopId: shop.id } }),
  ]);
  revalidatePath("/admin/team");
}
