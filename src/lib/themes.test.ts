import { describe, expect, it } from "vitest";
import { isShopTheme, shopTheme } from "./themes";

describe("shop themes", () => {
  it("accepts known themes", () => {
    expect(isShopTheme("classic")).toBe(true);
    expect(isShopTheme("royal-purple")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isShopTheme("neon")).toBe(false);
    expect(isShopTheme(undefined)).toBe(false);
  });

  it("falls back to classic", () => {
    expect(shopTheme("royal-purple")).toBe("royal-purple");
    expect(shopTheme("neon")).toBe("classic");
    expect(shopTheme(null)).toBe("classic");
  });
});
