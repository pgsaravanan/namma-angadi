import { readStoredImage } from "@/lib/storage";
import { getRequestShop } from "@/lib/tenant";

export async function GET(_: Request, { params }: RouteContext<"/s/[shop]/media/[...key]">) {
  const { key } = await params;
  const shop = await getRequestShop();
  const image = shop && (await readStoredImage(shop.id, key.join("/")));
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
