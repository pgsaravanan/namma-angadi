import { describe, expect, it } from "vitest";
import { reviewRequestWhatsAppUrl } from "./review-requests";

describe("reviewRequestWhatsAppUrl", () => {
  const url = reviewRequestWhatsAppUrl({
    shopName: "Jai's Kitchen",
    customerName: "  Priya Raman ",
    phone: "9876543210",
    orderUrl: "https://jais-kitchen.vercel.app/orders/abc123",
  });

  it("opens a chat with the customer's Indian number", () => {
    expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
  });

  it("greets by first name and links to the review section", () => {
    const text = decodeURIComponent(new URL(url).searchParams.get("text") ?? "");
    expect(text.startsWith("Hi Priya, hope you enjoyed your order from Jai's Kitchen!")).toBe(true);
    expect(text.endsWith("https://jais-kitchen.vercel.app/orders/abc123#reviews")).toBe(true);
  });
});
