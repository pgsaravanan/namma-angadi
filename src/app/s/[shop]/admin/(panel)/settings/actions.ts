"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/payment-methods";
import {
  encryptStoredCredentials,
  getProvider,
  isProviderEnabled,
  PaymentProviderError,
  readStoredCredentials,
} from "@/lib/payments";
import { isProviderId, PROVIDERS } from "@/lib/payments/catalog";
import { deleteStoredImage, ImageUploadError, resolveImageField } from "@/lib/storage";

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Enter the shop name").max(80),
  contactName: z.string().trim().max(80, "Contact name is too long"),
  supportEmail: z.union([z.email("Enter a valid email"), z.literal("")]),
  supportPhone: z.union([z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"), z.literal("")]),
});

export async function saveShopDetails(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("settings:manage");
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { name, contactName, supportEmail, supportPhone } = parsed.data;
  await db.shop.update({
    where: { id: shop.id },
    data: { name, contactName: contactName || null, supportEmail: supportEmail || null, supportPhone: supportPhone || null },
  });
  revalidatePath("/", "layout");
  return { success: "Shop details saved" };
}

const METHOD_IDS = PAYMENT_METHODS.map((method) => method.id) as [string, ...string[]];

const methodsSchema = z.array(z.enum(METHOD_IDS)).min(1, "Choose at least one payment method");

export async function savePaymentSettings(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("settings:manage");

  const providerId = formData.get("provider");
  if (!isProviderId(providerId) || !isProviderEnabled(providerId)) return { error: "Choose a payment provider" };

  const methods = methodsSchema.safeParse(formData.getAll("methods"));
  if (!methods.success) return { error: methods.error.issues[0]?.message };

  const stored = readStoredCredentials(shop);
  const previous = stored[providerId] ?? {};
  const credentials = { ...previous };
  for (const field of PROVIDERS[providerId].fields) {
    const value = String(formData.get(field.name) ?? "").trim();
    if (value.length > 256) return { error: `${field.label} is too long` };
    if (value || !field.secret) credentials[field.name] = value;
  }

  const provider = getProvider(providerId);
  const invalid = provider.validateCredentials(credentials);
  if (invalid) return { error: invalid };

  const changed = PROVIDERS[providerId].fields.some((field) => credentials[field.name] !== previous[field.name]);
  if (changed) {
    try {
      await provider.verifyCredentials({ shopId: shop.id, provider: providerId, credentials });
    } catch (error) {
      return {
        error:
          error instanceof PaymentProviderError
            ? `${PROVIDERS[providerId].label} did not accept these details: ${error.message}`
            : "Could not reach the payment provider to check the details. Please try again.",
      };
    }
  }

  await db.shop.update({
    where: { id: shop.id },
    data: {
      paymentProvider: providerId,
      paymentMethods: methods.data.join(","),
      paymentCredentialsEnc: encryptStoredCredentials({ ...stored, [providerId]: credentials }),
    },
  });
  revalidatePath("/admin", "layout");
  return { success: `Payment settings saved. Checkout now uses ${PROVIDERS[providerId].label}.` };
}

const optionalText = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);

const storefrontSchema = z.object({
  heroTitle: optionalText(80),
  heroSubtitle: optionalText(160),
  announcement: optionalText(120),
  about: optionalText(600),
  address: optionalText(200),
});

export async function saveStorefront(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("settings:manage");
  const parsed = storefrontSchema.safeParse({
    heroTitle: formData.get("heroTitle") ?? "",
    heroSubtitle: formData.get("heroSubtitle") ?? "",
    announcement: formData.get("announcement") ?? "",
    about: formData.get("about") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  let logoUrl: string | null;
  let heroImageUrl: string | null;
  try {
    logoUrl = await resolveImageField(shop.id, formData, { current: shop.logoUrl, field: "logo", kind: "branding" });
    heroImageUrl = await resolveImageField(shop.id, formData, {
      current: shop.heroImageUrl,
      field: "hero",
      kind: "branding",
    });
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    throw error;
  }

  const text = Object.fromEntries(Object.entries(parsed.data).map(([key, value]) => [key, value || null]));
  await db.shop.update({ where: { id: shop.id }, data: { ...text, logoUrl, heroImageUrl } });
  if (shop.logoUrl !== logoUrl) await deleteStoredImage(shop.logoUrl);
  if (shop.heroImageUrl !== heroImageUrl) await deleteStoredImage(shop.heroImageUrl);

  revalidatePath("/", "layout");
  return { success: "Storefront saved. Open your store to see it." };
}
