import { db } from "@/lib/db";
import { isPaidStatus } from "@/lib/order-status";
import { clientIp, isRateLimited } from "@/lib/request";
import { getRequestShop } from "@/lib/tenant";

export async function GET(request: Request, { params }: RouteContext<"/s/[shop]/api/checkout/status/[token]">) {
  if (isRateLimited(`status:${clientIp(request)}`, 120, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const shop = await getRequestShop();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  const { token } = await params;
  const order = await db.order.findFirst({ where: { shopId: shop.id, accessToken: token }, select: { status: true } });
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  return Response.json({ paid: isPaidStatus(order.status) }, { headers: { "Cache-Control": "no-store" } });
}
