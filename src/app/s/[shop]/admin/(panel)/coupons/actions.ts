"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";

const optionalNumber = z.preprocess((value) => (value === "" || value === null ? undefined : value), z.coerce.number().min(0).optional());
const INDIA_OFFSET = "+05:30";

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value ? `${value}:00${INDIA_OFFSET}` : undefined),
  z.coerce.date().optional(),
);

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,20}$/, "Code must be 3 to 20 letters or numbers"),
    type: z.enum(["PERCENT", "FLAT"]),
    value: z.coerce.number().positive("Enter the discount value"),
    minOrder: optionalNumber,
    maxDiscount: optionalNumber,
    usageLimit: optionalNumber,
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .refine((data) => data.type !== "PERCENT" || data.value <= 90, "Percentage discount can be at most 90%")
  .refine((data) => !data.startsAt || !data.endsAt || data.startsAt < data.endsAt, "End date must be after start date");

export async function createCoupon(_: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("coupons:manage");
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { code, type, value, minOrder, maxDiscount, usageLimit, startsAt, endsAt } = parsed.data;
  const existing = await db.coupon.findUnique({ where: { shopId_code: { shopId: shop.id, code } } });
  if (existing) return { error: `A coupon called ${code} already exists` };

  await db.coupon.create({
    data: {
      shopId: shop.id,
      code,
      type,
      value: type === "PERCENT" ? Math.round(value) : rupeesToPaise(value),
      minOrderPaise: minOrder ? rupeesToPaise(minOrder) : 0,
      maxDiscountPaise: maxDiscount ? rupeesToPaise(maxDiscount) : null,
      usageLimit: usageLimit ? Math.round(usageLimit) : null,
      startsAt: startsAt ?? null,
      endsAt: endsAt ?? null,
    },
  });

  revalidatePath("/admin/coupons");
  return { success: `Coupon ${code} created` };
}

export async function toggleCoupon(couponId: string) {
  const { shop } = await requireShopPermission("coupons:manage");
  const coupon = await db.coupon.findFirst({ where: { id: couponId, shopId: shop.id } });
  if (!coupon) return;
  await db.coupon.update({ where: { id: coupon.id }, data: { isActive: !coupon.isActive } });
  revalidatePath("/admin/coupons");
}
