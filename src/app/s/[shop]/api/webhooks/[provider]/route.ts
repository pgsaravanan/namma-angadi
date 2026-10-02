import { db } from "@/lib/db";
import { handleWebhookEvent } from "@/lib/orders";
import { getProvider, getShopPaymentConfig } from "@/lib/payments";
import { getRequestShop } from "@/lib/tenant";

export async function POST(request: Request, { params }: RouteContext<"/s/[shop]/api/webhooks/[provider]">) {
  const { provider } = await params;
  const shop = await getRequestShop();
  const config = shop && getShopPaymentConfig(shop);
  if (!shop || !config || config.provider !== provider) return new Response("Not configured", { status: 404 });

  const rawBody = await request.text();
  const event = getProvider(config.provider).parseWebhook(config, rawBody, request.headers);
  if (!event) return new Response("Invalid signature", { status: 401 });

  const eventKey = event.id ? `${shop.id}:${event.id}` : null;
  if (eventKey && (await db.webhookEvent.findUnique({ where: { id: eventKey } }))) {
    return new Response("Already processed");
  }

  await handleWebhookEvent(config, event);

  if (eventKey) {
    await db.webhookEvent.upsert({
      where: { id: eventKey },
      create: { id: eventKey, shopId: shop.id, event: event.type },
      update: {},
    });
  }
  return new Response("OK");
}
