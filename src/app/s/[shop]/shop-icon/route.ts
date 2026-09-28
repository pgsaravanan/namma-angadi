import { requireShop } from "@/lib/tenant";

function escapeXml(text: string) {
  return text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export async function GET() {
  const shop = await requireShop();
  const letter = escapeXml(shop.name.trim().charAt(0).toUpperCase() || "S");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#8c2f39"/>
  <text x="32" y="44" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="700" fill="#fdf3d8">${letter}</text>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
