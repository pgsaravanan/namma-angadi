import { appIconPng, isAppIconVariant } from "@/lib/app-icon";
import { requireShop } from "@/lib/tenant";

export async function GET(_request: Request, { params }: RouteContext<"/s/[shop]/app-icon/[variant]">) {
  const { variant } = await params;
  if (!isAppIconVariant(variant)) return new Response("Not found", { status: 404 });
  const shop = await requireShop();
  const png = await appIconPng(shop, variant);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
