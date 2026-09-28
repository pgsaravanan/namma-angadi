import { describe, expect, it } from "vitest";
import { calculateDiscount, MIN_ORDER_PAISE } from "./discount";

const base = {
  type: "PERCENT" as const,
  value: 10,
  minOrderPaise: 0,
  maxDiscountPaise: null,
  usageLimit: null,
  usedCount: 0,
  startsAt: null,
  endsAt: null,
  isActive: true,
};

describe("calculateDiscount", () => {
  it("applies a percentage discount", () => {
    expect(calculateDiscount(base, 100000)).toEqual({ ok: true, discountPaise: 10000 });
  });

  it("caps a percentage discount at the maximum", () => {
    expect(calculateDiscount({ ...base, maxDiscountPaise: 5000 }, 100000)).toEqual({ ok: true, discountPaise: 5000 });
  });

  it("never lets a flat discount bring the total below the minimum payable", () => {
    const result = calculateDiscount({ ...base, type: "FLAT", value: 50000 }, 20000);
    expect(result).toEqual({ ok: true, discountPaise: 20000 - MIN_ORDER_PAISE });
  });

  it("rejects inactive, expired, not-yet-started and used-up coupons", () => {
    const now = new Date("2026-09-28T12:00:00Z");
    expect(calculateDiscount({ ...base, isActive: false }, 100000, now).ok).toBe(false);
    expect(calculateDiscount({ ...base, endsAt: new Date("2026-09-01") }, 100000, now).ok).toBe(false);
    expect(calculateDiscount({ ...base, startsAt: new Date("2026-10-01") }, 100000, now).ok).toBe(false);
    expect(calculateDiscount({ ...base, usageLimit: 5, usedCount: 5 }, 100000, now).ok).toBe(false);
  });

  it("enforces the minimum order value", () => {
    expect(calculateDiscount({ ...base, minOrderPaise: 50000 }, 49999)).toMatchObject({ ok: false });
  });
});
