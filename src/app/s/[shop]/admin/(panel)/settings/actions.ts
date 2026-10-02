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
import { GST_RATES } from "@/lib/food";
import { INDIAN_STATES } from "@/lib/india";
import { rupeesToPaise } from "@/lib/money";
import { isProviderId, PROVIDERS } from "@/lib/payments/catalog";
import { isValidTime, WEEK_DAYS } from "@/lib/shop-hours";
import { deleteStoredImage, ImageUploadError, resolveImageField } from "@/lib/storage";

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Enter the shop name").max(80),
  contactName: z.string().trim().max(80, "Contact name is too long"),
  supportEmail: z.union([z.email("Enter a valid email"), z.literal("")]),
  supportPhone: z.union([z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"), z.literal("")]),
  whatsappNumber: z.union([z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit WhatsApp number"), z.literal("")]),
});

export async function saveShopDetails(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("settings:manage");
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { name, contactName, supportEmail, supportPhone, whatsappNumber } = parsed.data;
  await db.shop.update({
    where: { id: shop.id },
    data: {
      name,
      contactName: contactName || null,
      supportEmail: supportEmail || null,
      supportPhone: supportPhone || null,
      whatsappNumber: whatsappNumber || null,
    },
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
  about: optionalText(600),
  address: optionalText(200),
});

export async function saveStorefront(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("settings:manage");
  const parsed = storefrontSchema.safeParse({
    heroTitle: formData.get("heroTitle") ?? "",
    heroSubtitle: formData.get("heroSubtitle") ?? "",
    about: formData.get("about") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  let logoUrl: string | null;
  let heroImageUrl: string | null;
  let heroArtUrl: string | null;
  let iconUrl: string | null;
  try {
    logoUrl = await resolveImageField(shop.id, formData, { current: shop.logoUrl, field: "logo", kind: "branding" });
    iconUrl = await resolveImageField(shop.id, formData, { current: shop.iconUrl, field: "icon", kind: "icons" });
    heroImageUrl = await resolveImageField(shop.id, formData, {
      current: shop.heroImageUrl,
      field: "hero",
      kind: "branding",
    });
    heroArtUrl = await resolveImageField(shop.id, formData, { current: shop.heroArtUrl, field: "heroArt", kind: "branding" });
  } catch (error) {
    if (error instanceof ImageUploadError) return { error: error.message };
    throw error;
  }

  const text = Object.fromEntries(Object.entries(parsed.data).map(([key, value]) => [key, value || null]));
  await db.shop.update({ where: { id: shop.id }, data: { ...text, logoUrl, heroImageUrl, heroArtUrl, iconUrl } });
  if (shop.logoUrl !== logoUrl) await deleteStoredImage(shop.logoUrl);
  if (shop.heroImageUrl !== heroImageUrl) await deleteStoredImage(shop.heroImageUrl);
  if (shop.iconUrl !== iconUrl) await deleteStoredImage(shop.iconUrl);
  if (shop.heroArtUrl !== heroArtUrl) await deleteStoredImage(shop.heroArtUrl);

  revalidatePath("/", "layout");
  return { success: "Storefront saved. Open your store to see it." };
}

const money = z.preprocess((value) => (value === "" || value === null ? undefined : value), z.coerce.number().min(0).max(1_00_000).optional());
const time = z.union([z.string().refine(isValidTime, "Use a time like 08:00"), z.literal("")]);
const DAY_IDS = WEEK_DAYS.map((day) => day.id) as [string, ...string[]];

const orderingSchema = z
  .object({
    isAcceptingOrders: z.boolean(),
    openTime: time,
    closeTime: time,
    openDays: z.array(z.enum(DAY_IDS)).min(1, "Choose at least one open day"),
    deliveryEnabled: z.boolean(),
    pickupEnabled: z.boolean(),
    deliveryFee: money,
    freeDeliveryAbove: money,
    minOrder: money,
    deliveryPincodes: z.string().max(2000),
    deliveryNote: z.string().trim().max(140),
    notifyEmail: z.union([z.email("Enter a valid email for order alerts"), z.literal("")]),
  })
  .refine((data) => data.deliveryEnabled || data.pickupEnabled, "Turn on delivery, pickup or both")
  .refine((data) => Boolean(data.openTime) === Boolean(data.closeTime), "Enter both the opening and closing time")
  .refine((data) => !data.openTime || data.openTime < data.closeTime, "Closing time must be after opening time");

export async function saveOrdering(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("settings:manage");
  const parsed = orderingSchema.safeParse({
    isAcceptingOrders: formData.get("isAcceptingOrders") === "on",
    openTime: formData.get("openTime") ?? "",
    closeTime: formData.get("closeTime") ?? "",
    openDays: formData.getAll("openDays"),
    deliveryEnabled: formData.get("deliveryEnabled") === "on",
    pickupEnabled: formData.get("pickupEnabled") === "on",
    deliveryFee: formData.get("deliveryFee"),
    freeDeliveryAbove: formData.get("freeDeliveryAbove"),
    minOrder: formData.get("minOrder"),
    deliveryPincodes: formData.get("deliveryPincodes") ?? "",
    deliveryNote: formData.get("deliveryNote") ?? "",
    notifyEmail: formData.get("notifyEmail") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const data = parsed.data;
  const pincodes = [...new Set(data.deliveryPincodes.split(/[\s,]+/).filter(Boolean))];
  const invalid = pincodes.find((pincode) => !/^[1-9][0-9]{5}$/.test(pincode));
  if (invalid) return { error: `"${invalid}" is not a valid PIN code` };

  await db.shop.update({
    where: { id: shop.id },
    data: {
      isAcceptingOrders: data.isAcceptingOrders,
      openTime: data.openTime || null,
      closeTime: data.closeTime || null,
      openDays: data.openDays.join(","),
      deliveryEnabled: data.deliveryEnabled,
      pickupEnabled: data.pickupEnabled,
      deliveryFeePaise: data.deliveryFee ? rupeesToPaise(data.deliveryFee) : 0,
      freeDeliveryAbovePaise: data.freeDeliveryAbove ? rupeesToPaise(data.freeDeliveryAbove) : null,
      minOrderPaise: data.minOrder ? rupeesToPaise(data.minOrder) : 0,
      deliveryPincodes: pincodes.length ? pincodes.join(", ") : null,
      deliveryNote: data.deliveryNote || null,
      notifyEmail: data.notifyEmail || null,
    },
  });
  revalidatePath("/", "layout");
  return { success: "Ordering and delivery settings saved" };
}

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const complianceSchema = z.object({
  legalName: z.string().trim().max(120),
  gstin: z.union([z.string().trim().toUpperCase().regex(GSTIN_PATTERN, "GSTIN should be 15 characters, e.g. 33ABCDE1234F1Z5"), z.literal("")]),
  shopState: z.union([z.enum(INDIAN_STATES), z.literal("")]),
  fssaiNumber: z.union([z.string().trim().regex(/^\d{14}$/, "FSSAI licence number has 14 digits"), z.literal("")]),
  defaultGstRate: z.coerce.number().refine((rate) => GST_RATES.includes(rate as never), "Choose a GST rate"),
});

export async function saveCompliance(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("settings:manage");
  const parsed = complianceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { legalName, gstin, shopState, fssaiNumber, defaultGstRate } = parsed.data;
  if (gstin && !shopState) return { error: "Choose the state your GSTIN is registered in" };

  await db.shop.update({
    where: { id: shop.id },
    data: {
      legalName: legalName || null,
      gstin: gstin || null,
      shopState: shopState || null,
      fssaiNumber: fssaiNumber || null,
      defaultGstRate,
    },
  });
  revalidatePath("/", "layout");
  return { success: "Business and tax details saved" };
}
