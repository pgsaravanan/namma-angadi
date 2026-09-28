"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/FormMessage";
import { headers } from "next/headers";
import { createSession, destroySession, getSession, getShopStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { authenticate } from "@/lib/login";
import { hashPassword, verifyPassword } from "@/lib/password";
import { consumeResetToken, createResetToken, findValidResetToken } from "@/lib/password-reset";
import { clientIpFrom, isRateLimited, originFromHeaders } from "@/lib/request";
import { requireShop } from "@/lib/tenant";

export async function loginToShop(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const result = await authenticate(formData.get("email"), formData.get("password"));
  if ("error" in result) return { error: result.error };

  const { user } = result;
  const isMember =
    user.isPlatformAdmin ||
    (await db.membership.findUnique({ where: { shopId_userId: { shopId: shop.id, userId: user.id } } }));
  if (!isMember) return { error: "Invalid email or password" };

  await createSession(user.id, shop.id);
  redirect("/admin");
}

export async function logoutFromShop() {
  await destroySession();
  redirect("/admin/login");
}

const MIN_STAFF_PASSWORD = 10;

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const staff = await getShopStaff(shop.id);
  if (!staff) redirect("/admin/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < MIN_STAFF_PASSWORD) return { error: `Use at least ${MIN_STAFF_PASSWORD} characters` };
  if (next !== formData.get("confirm")) return { error: "The new passwords don't match" };

  const user = await db.user.findUniqueOrThrow({ where: { id: staff.user.id } });
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Your current password is not right" };

  const session = await getSession();
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } }),
    db.session.deleteMany({ where: { userId: user.id, NOT: { id: session!.id } } }),
  ]);
  return { success: "Password changed. You've been signed out on other devices." };
}

export async function requestStaffReset(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const done = { success: "If that email can sign in to this shop, we've sent a reset link." };
  const ip = clientIpFrom(await headers());
  if (!email || isRateLimited(`staff-reset:${ip}`, 5, 15 * 60_000)) return done;

  const user = await db.user.findUnique({ where: { email }, include: { memberships: { where: { shopId: shop.id } } } });
  if (user && (user.isPlatformAdmin || user.memberships.length)) {
    const token = await createResetToken({ userId: user.id });
    await sendEmail({
      shopId: shop.id,
      to: user.email,
      subject: `Reset your ${shop.name} admin password`,
      text: `Hi ${user.name.split(" ")[0]},\n\nUse this link within an hour to choose a new password:\n${originFromHeaders(await headers())}/admin/reset/${token}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
  }
  return done;
}

export async function resetStaffPassword(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_STAFF_PASSWORD) return { error: `Use at least ${MIN_STAFF_PASSWORD} characters` };
  const record = await consumeResetToken(token, password, "reset");
  if (!record?.userId) return { error: "This link has expired. Please ask for a new one." };
  redirect("/admin/login?reset=1");
}

export async function acceptInvite(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_STAFF_PASSWORD) return { error: `Use at least ${MIN_STAFF_PASSWORD} characters` };
  if (password !== formData.get("confirm")) return { error: "The passwords don't match" };

  const invite = await findValidResetToken(token, "invite");
  if (!invite?.userId) return { error: "This invite has expired. Ask for a new invite link." };
  const member = await db.membership.findUnique({ where: { shopId_userId: { shopId: shop.id, userId: invite.userId } } });
  if (!member) return { error: "This invite is for a different shop. Open the link exactly as it was sent to you." };

  const record = await consumeResetToken(token, password, "invite");
  if (!record?.userId) return { error: "This invite has expired. Ask for a new invite link." };

  await createSession(record.userId, shop.id);
  redirect("/admin?welcome=1");
}
