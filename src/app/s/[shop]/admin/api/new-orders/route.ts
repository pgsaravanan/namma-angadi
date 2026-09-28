import { newOrderSnapshot } from "@/lib/admin-orders";
import { getShopStaff } from "@/lib/auth";
import { getRequestShop } from "@/lib/tenant";

export async function GET() {
  const shop = await getRequestShop();
  const staff = shop && (await getShopStaff(shop.id));
  if (!shop || !staff) return Response.json({ error: "Not signed in" }, { status: 401 });

  return Response.json(await newOrderSnapshot(shop.id), { headers: { "Cache-Control": "no-store" } });
}
