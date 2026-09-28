import type { Shop } from "@/generated/prisma/client";
import { formatIndianMobile } from "./india";
import { formatPaise } from "./money";
import { openingHoursText } from "./shop-hours";

export const POLICIES = [
  { slug: "contact", title: "Contact us" },
  { slug: "delivery", title: "Delivery and pickup" },
  { slug: "refund", title: "Cancellation and refunds" },
  { slug: "terms", title: "Terms and conditions" },
  { slug: "privacy", title: "Privacy policy" },
] as const;

export type PolicySlug = (typeof POLICIES)[number]["slug"];

export function isPolicySlug(value: string): value is PolicySlug {
  return POLICIES.some((policy) => policy.slug === value);
}

type PolicyShop = Pick<
  Shop,
  | "name"
  | "legalName"
  | "contactName"
  | "address"
  | "supportPhone"
  | "supportEmail"
  | "fssaiNumber"
  | "deliveryEnabled"
  | "pickupEnabled"
  | "deliveryFeePaise"
  | "freeDeliveryAbovePaise"
  | "minOrderPaise"
  | "deliveryPincodes"
  | "deliveryNote"
  | "isAcceptingOrders"
  | "openTime"
  | "closeTime"
  | "openDays"
>;

function contactLine(shop: PolicyShop) {
  return [shop.supportPhone && `phone ${formatIndianMobile(shop.supportPhone)}`, shop.supportEmail && `email ${shop.supportEmail}`]
    .filter(Boolean)
    .join(" or ");
}

export function defaultPolicy(slug: PolicySlug, shop: PolicyShop) {
  const business = shop.legalName ?? shop.name;
  const contact = contactLine(shop) || "the contact details on our website";
  const hours = openingHoursText(shop);

  switch (slug) {
    case "contact":
      return [
        `${business}${shop.contactName ? `, run by ${shop.contactName}` : ""}.`,
        shop.address ? `Address: ${shop.address}` : "",
        shop.supportPhone ? `Phone / WhatsApp: ${formatIndianMobile(shop.supportPhone)}` : "",
        shop.supportEmail ? `Email: ${shop.supportEmail}` : "",
        hours ? `Hours: ${hours}` : "",
        shop.fssaiNumber ? `FSSAI licence no.: ${shop.fssaiNumber}` : "",
        "",
        "For questions about an order, please mention your order number so we can help you quickly.",
      ]
        .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
        .join("\n");

    case "delivery":
      return [
        shop.deliveryEnabled
          ? `We deliver freshly prepared food and products ${shop.deliveryPincodes ? `to these PIN codes: ${shop.deliveryPincodes}` : "in and around our city"}.`
          : "We do not offer home delivery at the moment.",
        shop.deliveryEnabled
          ? `Delivery charge: ${shop.deliveryFeePaise ? formatPaise(shop.deliveryFeePaise) : "free"}${shop.freeDeliveryAbovePaise ? `, free for orders above ${formatPaise(shop.freeDeliveryAbovePaise)}` : ""}.`
          : "",
        shop.minOrderPaise ? `Minimum order value: ${formatPaise(shop.minOrderPaise)}.` : "",
        shop.deliveryNote ?? "",
        shop.pickupEnabled ? `You can also choose to pick up your order from ${shop.address ?? "our kitchen"}.` : "",
        hours ? `We take orders ${hours}.` : "",
        "",
        "Delivery times are estimates. We will call you on your mobile number if there is any delay. Please make sure someone is available to receive the order, especially for cooked food.",
      ]
        .filter(Boolean)
        .join("\n\n");

    case "refund":
      return [
        "Because our food is freshly prepared for each order, we cannot accept returns.",
        "- You can cancel an order and get a full refund until we start preparing it. Please call us as soon as possible.",
        "- If an item is missing, damaged or not as described, tell us within 24 hours of delivery with a photo, and we will replace it or refund you.",
        "- If we cannot fulfil your order, we will refund the full amount.",
        "Refunds go back to the UPI account or card you paid with. Banks usually take 5 to 7 working days to show the money.",
        `To ask for a cancellation or refund, contact us on ${contact}.`,
      ].join("\n\n");

    case "terms":
      return [
        `These terms apply when you order from ${business} through this website.`,
        "- Prices are in Indian rupees and include applicable taxes unless stated otherwise.",
        "- Your order is confirmed only after your payment is successful. You will receive an order number.",
        "- Product photos are for illustration. Home-made food can vary slightly in look and taste from batch to batch.",
        "- Please check the ingredients if you have allergies, and ask us if you are unsure.",
        "- We may cancel an order if an item is unavailable or we cannot deliver to your address. You will get a full refund.",
        `Questions? Contact us on ${contact}.`,
      ].join("\n\n");

    case "privacy":
      return [
        `${business} collects only the details needed to take and deliver your order: your name, mobile number, email (if you give it) and delivery address.`,
        "- We use them to prepare and deliver your order, send you your bill and order updates, and contact you about your order.",
        "- Payments are handled by our payment partner. We never see or store your UPI PIN or card details.",
        "- We do not sell or share your details with anyone else, except delivery partners where needed to deliver your order, or when required by law.",
        "- If you create an account, your order history and saved address are kept so you can check out faster. You can ask us to delete your account at any time.",
        `To see, correct or delete your details, contact us on ${contact}.`,
      ].join("\n\n");
  }
}
