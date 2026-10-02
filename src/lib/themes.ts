export const SHOP_THEMES = [
  { id: "classic", label: "Classic", hint: "Warm maroon and saffron" },
  { id: "royal-purple", label: "Royal purple", hint: "Deep purple with gold" },
] as const;

export type ShopTheme = (typeof SHOP_THEMES)[number]["id"];

export const DEFAULT_SHOP_THEME: ShopTheme = "classic";

export function isShopTheme(value: unknown): value is ShopTheme {
  return SHOP_THEMES.some((theme) => theme.id === value);
}

export function shopTheme(value: unknown): ShopTheme {
  return isShopTheme(value) ? value : DEFAULT_SHOP_THEME;
}
