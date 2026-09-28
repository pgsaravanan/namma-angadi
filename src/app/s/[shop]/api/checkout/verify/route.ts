import { z } from "zod";
import { CheckoutError, confirmClientPayment } from "@/lib/orders";
import { PaymentProviderError } from "@/lib/payments";
import { clientIp, isRateLimited, isSameOrigin } from "@/lib/request";
import { getRequestShop } from "@/lib/tenant";

const bodySchema = z.object({
  provider: z.string().min(1).max(32),
  payload: z.record(z.string().max(64), z.string().max(512)),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (isRateLimited(`verify:${clientIp(request)}`, 30, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const shop = await getRequestShop();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid payment details" }, { status: 400 });

  try {
    const order = await confirmClientPayment(shop, parsed.data.provider, parsed.data.payload);
    return Response.json({ accessToken: order.accessToken });
  } catch (error) {
    if (error instanceof CheckoutError || error instanceof PaymentProviderError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Payment verification failed", error);
    return Response.json({ error: "We could not confirm your payment yet." }, { status: 500 });
  }
}
