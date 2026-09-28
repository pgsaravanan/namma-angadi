import { CheckoutError, checkoutSchema, createCheckout } from "@/lib/orders";
import { clientIp, isRateLimited, isSameOrigin, requestOrigin } from "@/lib/request";
import { getActiveShop } from "@/lib/tenant";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (isRateLimited(`checkout:${clientIp(request)}`, 10, 60_000)) {
    return Response.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  const shop = await getActiveShop();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Please check your details" }, { status: 400 });
  }

  try {
    return Response.json(await createCheckout(shop, parsed.data, requestOrigin(request)));
  } catch (error) {
    if (error instanceof CheckoutError) return Response.json({ error: error.message }, { status: 409 });
    console.error("Checkout failed", error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
