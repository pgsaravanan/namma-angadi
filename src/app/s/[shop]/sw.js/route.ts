import { requireShop } from "@/lib/tenant";
import { shopThemeColors } from "@/lib/themes";

function escapeHtml(text: string) {
  return text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export async function GET() {
  const shop = await requireShop();
  const { color, background } = shopThemeColors(shop.theme);
  const offlinePage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(shop.name)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:${background};color:#2b2118;text-align:center;padding:24px;box-sizing:border-box}h1{color:${color};font-size:1.4rem}button{margin-top:12px;padding:10px 20px;border:0;border-radius:8px;background:${color};color:#fff;font-size:1rem}</style></head><body><main><h1>${escapeHtml(shop.name)}</h1><p>You're offline. Check your internet connection and try again.</p><button onclick="location.reload()">Try again</button></main></body></html>`;

  const script = `const OFFLINE_PAGE = ${JSON.stringify(offlinePage)};
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
  );
});
`;

  return new Response(script, {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
