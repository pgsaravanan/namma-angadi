export const PROMOTION_KINDS = {
  launch: "New launch",
  offer: "Special offer",
  festive: "Festive special",
  bestseller: "Customer favourites",
} as const;

export type PromotionKind = keyof typeof PROMOTION_KINDS;

export function isPromotionKind(value: unknown): value is PromotionKind {
  return typeof value === "string" && value in PROMOTION_KINDS;
}

export const MAX_ANNOUNCEMENTS = 6;
export const MAX_PROMOTION_PRODUCTS = 8;
export const MAX_STORIES = 20;
