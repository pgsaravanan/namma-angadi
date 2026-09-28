import { z } from "zod";
import { PINCODE_PATTERN } from "@/lib/india";
import { releaseExpiredOrders } from "@/lib/orders";
import { cartLinesSchema, deliveryMethodSchema, quoteCart } from "@/lib/pricing";
import { clientIp, isRateLimited, isSameOrigin } from "@/lib/request";
import { getActiveShop } from "@/lib/tenant";

const bodySchema = z.object({
  items: cartLinesSchema,
  couponCode: z.string().trim().max(40).nullish(),
  deliveryMethod: deliveryMethodSchema.nullish(),
  pincode: z.string().trim().regex(PINCODE_PATTERN).nullish().catch(null),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (isRateLimited(`quote:${clientIp(request)}`, 90, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const shop = await getActiveShop();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid cart" }, { status: 400 });

  await releaseExpiredOrders(shop.id);
  return Response.json(await quoteCart(shop, parsed.data));
}
