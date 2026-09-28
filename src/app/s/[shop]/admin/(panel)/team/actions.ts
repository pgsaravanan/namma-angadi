"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]),
});

export async function addMember(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("team:manage");
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { name, email, password, role } = parsed.data;
  let user = await db.user.findUnique({ where: { email } });
  const isNewUser = !user;
  user ??= await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });

  const existing = await db.membership.findUnique({ where: { shopId_userId: { shopId: shop.id, userId: user.id } } });
  if (existing) return { error: `${email} is already in your team` };

  await db.membership.create({ data: { shopId: shop.id, userId: user.id, role } });
  revalidatePath("/admin/team");
  return {
    success: isNewUser
      ? `${name} can now sign in with the password you set. Ask them to keep it private.`
      : `${email} already had an account, so they can sign in with their existing password.`,
  };
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
