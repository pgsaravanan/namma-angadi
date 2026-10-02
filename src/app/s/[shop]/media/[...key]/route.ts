import { contentTypeForKey, readStoredImage, signedMediaUrl } from "@/lib/storage";
import { getRequestShop } from "@/lib/tenant";

const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";
const VIDEO_LINK_SECONDS = 24 * 60 * 60;

export async function GET(request: Request, { params }: RouteContext<"/s/[shop]/media/[...key]">) {
  const { key } = await params;
  const path = key.join("/");
  const shop = await getRequestShop();
  if (!shop) return new Response("Not found", { status: 404 });

  if (contentTypeForKey(path).startsWith("video/")) {
    const signed = await signedMediaUrl(shop.id, path, VIDEO_LINK_SECONDS);
    if (signed) {
      return new Response(null, {
        status: 302,
        headers: { Location: signed, "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      });
    }
  }

  const file = await readStoredImage(shop.id, path);
  if (!file) return new Response("Not found", { status: 404 });

  const headers = {
    "Content-Type": contentTypeForKey(path),
    "Cache-Control": CACHE,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = file.length;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    return new Response(new Uint8Array(file.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new Response(new Uint8Array(file), { headers: { ...headers, "Content-Length": String(file.length) } });
}
