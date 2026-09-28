import { describe, expect, it } from "vitest";
import { safeLocalPath } from "./safe-redirect";

describe("safeLocalPath", () => {
  it("keeps paths on this site", () => {
    expect(safeLocalPath("/cart")).toBe("/cart");
    expect(safeLocalPath("/products?category=abc")).toBe("/products?category=abc");
  });

  it("rejects anything that could leave the site", () => {
    for (const value of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/a b", undefined]) {
      expect(safeLocalPath(value)).toBe("/account");
    }
  });

  it("leaves an encoded backslash as a harmless path", () => {
    expect(safeLocalPath("/%5Cevil")).toBe("/%5Cevil");
  });
});
