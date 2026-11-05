export const SHOP_THEMES = [
  { id: "classic", label: "Classic", hint: "Warm maroon and saffron", color: "#8c2f39", background: "#fbf8f3" },
  { id: "royal-purple", label: "Royal purple", hint: "Deep purple with gold", color: "#5b2a86", background: "#f8f4fb" },
] as const;

export type ShopTheme = (typeof SHOP_THEMES)[number]["id"];

export const DEFAULT_SHOP_THEME: ShopTheme = "classic";

export function isShopTheme(value: unknown): value is ShopTheme {
  return SHOP_THEMES.some((theme) => theme.id === value);
}

export function shopTheme(value: unknown): ShopTheme {
  return isShopTheme(value) ? value : DEFAULT_SHOP_THEME;
}

export function shopThemeColors(value: unknown) {
  const theme = SHOP_THEMES.find((candidate) => candidate.id === shopTheme(value))!;
  return { color: theme.color, background: theme.background };
}
