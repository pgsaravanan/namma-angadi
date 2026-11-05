import "server-only";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { readStoredImage } from "./storage";
import { shopThemeColors } from "./themes";

type IconShop = { id: string; name: string; iconUrl: string | null; theme: string };

export const APP_ICONS = {
  "192": { size: 192, padded: false },
  "512": { size: 512, padded: false },
  maskable: { size: 512, padded: true },
  apple: { size: 180, padded: true },
} as const;

export type AppIconVariant = keyof typeof APP_ICONS;

export function isAppIconVariant(value: string): value is AppIconVariant {
  return Object.hasOwn(APP_ICONS, value);
}

export function appIconVersion(shop: Pick<IconShop, "iconUrl" | "theme">) {
  return encodeURIComponent(`${shop.iconUrl?.split("/").pop() ?? "letter"}-${shop.theme}`);
}

function escapeXml(text: string) {
  return text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function letterIconSvg(shop: Pick<IconShop, "name" | "theme">) {
  const letter = escapeXml(shop.name.trim().charAt(0).toUpperCase() || "S");
  const { color, background } = shopThemeColors(shop.theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${color}"/>
  <text x="32" y="44" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="700" fill="${background}">${letter}</text>
</svg>`;
}

async function sourceImage(shop: IconShop) {
  const key = shop.iconUrl?.startsWith("/media/") ? shop.iconUrl.slice("/media/".length) : null;
  const stored = key ? await readStoredImage(shop.id, key) : null;
  return stored ?? letterIconPng(shop);
}

async function letterIconPng(shop: IconShop) {
  const { color, background } = shopThemeColors(shop.theme);
  const letter = shop.name.trim().charAt(0).toUpperCase() || "S";
  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 112,
          background: color,
          color: background,
          fontSize: 288,
          fontWeight: 700,
        }}
      >
        {letter}
      </div>
    ),
    { width: 512, height: 512 },
  );
  return Buffer.from(await image.arrayBuffer());
}

export async function appIconPng(shop: IconShop, variant: AppIconVariant) {
  const { size, padded } = APP_ICONS[variant];
  const source = await sourceImage(shop);
  if (!padded) {
    return sharp(source, { density: 384 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }
  const inner = Math.round(size * 0.64);
  const art = await sharp(source, { density: 384 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: shopThemeColors(shop.theme).background } })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toBuffer();
}
