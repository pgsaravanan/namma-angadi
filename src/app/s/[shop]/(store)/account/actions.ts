"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import {
  AccountError,
  authenticateCustomer,
  createCustomerSession,
  destroyCustomerSession,
  getCustomerAccount,
  registerCustomer,
} from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { INDIAN_STATES, PINCODE_PATTERN } from "@/lib/india";
import { consumeResetToken, createResetToken } from "@/lib/password-reset";
import { clientIpFrom, isRateLimited, originFromHeaders } from "@/lib/request";
import { safeLocalPath } from "@/lib/safe-redirect";
import { requireShop } from "@/lib/tenant";


async function limited(key: string) {
  return isRateLimited(`${key}:${clientIpFrom(await headers())}`, 10, 15 * 60_000);
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const email = String(formData.get("email") ?? "");
  if (await limited(`customer-login:${shop.id}:${email.toLowerCase()}`)) {
    return { error: "Too many attempts. Please try again in 15 minutes." };
  }
  const account = await authenticateCustomer(shop.id, email, String(formData.get("password") ?? ""));
  if (!account) return { error: "Wrong email or password" };
  await createCustomerSession(account.id);
  redirect(safeLocalPath(formData.get("next")));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.email("Enter a valid email").max(120),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  password: z.string().min(8, "Choose a password of at least 8 characters").max(200),
});

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  if (await limited(`customer-register:${shop.id}`)) return { error: "Too many attempts. Please try again later." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const account = await registerCustomer(shop.id, parsed.data);
    await createCustomerSession(account.id);
  } catch (error) {
    if (error instanceof AccountError) return { error: error.message };
    throw error;
  }
  redirect(safeLocalPath(formData.get("next")));
}

export async function signOut() {
  await destroyCustomerSession();
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.union([z.string().trim().min(5, "Enter your house number and street").max(200), z.literal("")]),
  line2: z.string().trim().max(200),
  city: z.union([z.string().trim().min(2).max(80), z.literal("")]),
  state: z.union([z.enum(INDIAN_STATES), z.literal("")]),
  pincode: z.union([z.string().trim().regex(PINCODE_PATTERN, "Enter a valid 6-digit PIN code"), z.literal("")]),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const account = await getCustomerAccount(shop.id);
  if (!account) redirect("/account/login");

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { name, phone, line1, line2, city, state, pincode } = parsed.data;

  await db.customerAccount.update({
    where: { id: account.id },
    data: {
      name,
      phone,
      addressLine1: line1 || null,
      addressLine2: line2 || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
    },
  });
  return { success: "Saved" };
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const done = { success: "If that email has an account, we've sent a link to reset the password." };
  if (!email || (await limited(`customer-reset:${shop.id}`))) return done;

  const account = await db.customerAccount.findUnique({ where: { shopId_email: { shopId: shop.id, email } } });
  if (account) {
    const token = await createResetToken({ customerAccountId: account.id });
    const link = `${originFromHeaders(await headers())}/account/reset/${token}`;
    await sendEmail({
      shopId: shop.id,
      to: account.email,
      subject: `Reset your ${shop.name} password`,
      text: `Hi ${account.name.split(" ")[0]},\n\nUse this link within an hour to choose a new password:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
  }
  return done;
}

export async function resetPassword(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Choose a password of at least 8 characters" };
  const record = await consumeResetToken(token, password);
  if (!record?.customerAccountId) return { error: "This link has expired. Please ask for a new one." };
  await createCustomerSession(record.customerAccountId);
  redirect("/account");
}
