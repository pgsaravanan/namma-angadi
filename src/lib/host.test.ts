import { describe, expect, it } from "vitest";
import { isValidSlug, resolveHost } from "./host";

describe("resolveHost", () => {
  it("treats the root domain and www as the platform", () => {
    expect(resolveHost("localhost:3000", "localhost:3000")).toEqual({ kind: "platform" });
    expect(resolveHost("www.nammaangadi.in", "nammaangadi.in")).toEqual({ kind: "platform" });
  });

  it("maps a subdomain to its shop", () => {
    expect(resolveHost("Ravi-Textiles.localhost:3000", "localhost:3000")).toEqual({ kind: "shop", key: "ravi-textiles" });
  });

  it("does not treat reserved or nested subdomains as shops", () => {
    expect(resolveHost("admin.nammaangadi.in", "nammaangadi.in")).toEqual({ kind: "platform" });
    expect(resolveHost("a.b.nammaangadi.in", "nammaangadi.in")).toEqual({ kind: "platform" });
  });

  it("passes custom domains through without the port", () => {
    expect(resolveHost("www.ravitextiles.com:443", "nammaangadi.in")).toEqual({ kind: "shop", key: "www.ravitextiles.com" });
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase words with hyphens", () => {
    expect(isValidSlug("lakshmi-stores")).toBe(true);
  });

  it("rejects dots, leading hyphens, short and reserved names", () => {
    expect(isValidSlug("a.b")).toBe(false);
    expect(isValidSlug("-shop")).toBe(false);
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("admin")).toBe(false);
  });
});
