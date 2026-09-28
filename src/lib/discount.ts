import type { Coupon } from "@/generated/prisma/client";

export const MIN_ORDER_PAISE = 100;

type DiscountResult = { ok: true; discountPaise: number } | { ok: false; error: string };

export function calculateDiscount(
  coupon: Pick<
    Coupon,
    "type" | "value" | "minOrderPaise" | "maxDiscountPaise" | "usageLimit" | "usedCount" | "startsAt" | "endsAt" | "isActive"
  >,
  subtotalPaise: number,
  now = new Date(),
): DiscountResult {
  if (!coupon.isActive) return { ok: false, error: "This coupon is not active" };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: "This coupon is not valid yet" };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, error: "This coupon has expired" };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "This coupon has reached its usage limit" };
  }
  if (subtotalPaise < coupon.minOrderPaise) {
    return { ok: false, error: `Add items worth ₹${(coupon.minOrderPaise / 100).toFixed(0)} or more to use this coupon` };
  }

  let discount = coupon.type === "PERCENT" ? Math.floor((subtotalPaise * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscountPaise !== null) discount = Math.min(discount, coupon.maxDiscountPaise);
  discount = Math.max(0, Math.min(discount, subtotalPaise - MIN_ORDER_PAISE));

  return { ok: true, discountPaise: discount };
}
