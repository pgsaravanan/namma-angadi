import { letterIconSvg } from "@/lib/app-icon";
import { requireShop } from "@/lib/tenant";

export async function GET() {
  const shop = await requireShop();
  return new Response(letterIconSvg(shop), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
