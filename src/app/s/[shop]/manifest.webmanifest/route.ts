import { appIconVersion } from "@/lib/app-icon";
import { requireShop } from "@/lib/tenant";
import { shopThemeColors } from "@/lib/themes";

export async function GET() {
  const shop = await requireShop();
  const { color, background } = shopThemeColors(shop.theme);
  const version = appIconVersion(shop);
  const icon = (variant: string, size: number, purpose: string) => ({
    src: `/app-icon/${variant}?v=${version}`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose,
  });

  const manifest = {
    id: "/",
    name: shop.name,
    short_name: shop.name,
    description: shop.heroSubtitle ?? undefined,
    lang: "en-IN",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: color,
    background_color: background,
    icons: [icon("192", 192, "any"), icon("512", 512, "any"), icon("maskable", 512, "maskable")],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300, s-maxage=3600" },
  });
}
