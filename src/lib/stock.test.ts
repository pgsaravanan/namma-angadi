import { describe, expect, it } from "vitest";
import { formatStockAmount, packsFromStock, parsePackAmount, productStock, variantStock } from "./stock";

describe("parsePackAmount", () => {
  it("reads grams and kilograms", () => {
    expect(parsePackAmount("250 g", "g")).toBe(250);
    expect(parsePackAmount("100gm", "g")).toBe(100);
    expect(parsePackAmount("1 kg", "g")).toBe(1000);
    expect(parsePackAmount("1.5 Kg pouch", "g")).toBe(1500);
  });

  it("reads millilitres and litres", () => {
    expect(parsePackAmount("500 ml", "ml")).toBe(500);
    expect(parsePackAmount("1 L", "ml")).toBe(1000);
    expect(parsePackAmount("2 litre", "ml")).toBe(2000);
  });

  it("ignores labels in the other unit or without a number", () => {
    expect(parsePackAmount("500 ml", "g")).toBeNull();
    expect(parsePackAmount("1 kg", "ml")).toBeNull();
    expect(parsePackAmount("Family pack", "g")).toBeNull();
  });
});

describe("shared stock", () => {
  it("works out whole packs from the total", () => {
    expect(packsFromStock(10_000, 250)).toBe(40);
    expect(packsFromStock(900, 500)).toBe(1);
    expect(packsFromStock(400, 500)).toBe(0);
    expect(packsFromStock(1000, null)).toBe(0);
  });

  it("uses the shared total only when the product has a unit", () => {
    expect(variantStock({ stock: 10_000, stockUnit: "g" }, { stock: 3, packAmount: 1000 })).toBe(10);
    expect(variantStock({ stock: 10_000, stockUnit: null }, { stock: 3, packAmount: 1000 })).toBe(3);
  });

  it("adds up packs across sizes", () => {
    const product = { stock: 1000, stockUnit: "g", variants: [{ stock: 0, packAmount: 250 }, { stock: 0, packAmount: 1000 }] };
    expect(productStock(product)).toBe(5);
  });

  it("formats amounts for people", () => {
    expect(formatStockAmount(750, "g")).toBe("750 g");
    expect(formatStockAmount(10_000, "g")).toBe("10 kg");
    expect(formatStockAmount(2500, "ml")).toBe("2.5 L");
  });
});
