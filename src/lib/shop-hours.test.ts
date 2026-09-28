import { describe, expect, it } from "vitest";
import { openingHoursText, shopAvailability } from "./shop-hours";

const shop = { isAcceptingOrders: true, openTime: "08:00", closeTime: "20:00", openDays: "mon,tue,wed,thu,fri,sat" };
const ist = (iso: string) => new Date(`${iso}+05:30`);

describe("shopAvailability", () => {
  it("is open inside hours on an open day (India time)", () => {
    expect(shopAvailability(shop, ist("2026-09-28T09:30:00"))).toEqual({ open: true });
  });

  it("explains when a closed shop opens next", () => {
    expect(shopAvailability(shop, ist("2026-09-28T06:00:00"))).toMatchObject({ message: /open today at 8 am/ });
    expect(shopAvailability(shop, ist("2026-09-28T21:00:00"))).toMatchObject({ message: /open tomorrow at 8 am/ });
    expect(shopAvailability(shop, ist("2026-10-03T21:00:00"))).toMatchObject({ message: /open on Mon at 8 am/ });
  });

  it("respects the accepting-orders switch and missing hours", () => {
    expect(shopAvailability({ ...shop, isAcceptingOrders: false }).open).toBe(false);
    expect(shopAvailability({ ...shop, openTime: null, closeTime: null })).toEqual({ open: true });
  });

  it("describes the hours", () => {
    expect(openingHoursText(shop)).toBe("Mon, Tue, Wed, Thu, Fri, Sat, 8 am – 8 pm");
  });
});
