import { db } from "@/lib/db";
import { getShopPaymentConfig, isProviderEnabled } from "@/lib/payments";
import { gatewayStatus, latestSimulatedPayment, signReturnPayload } from "@/lib/payments/testpay";
import { getRequestShop } from "@/lib/tenant";

export async function GET(_: Request, { params }: RouteContext<"/s/[shop]/pay/test/[orderId]/status">) {
  const { orderId } = await params;
  const shop = await getRequestShop();
  const config = shop && getShopPaymentConfig(shop);
  if (!shop || !config || config.provider !== "testpay" || !isProviderEnabled("testpay")) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const order = await db.order.findFirst({ where: { shopId: shop.id, provider: "testpay", providerOrderId: orderId } });
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });

  const payment = await latestSimulatedPayment(shop.id, orderId);
  const status = gatewayStatus(payment);
  const orderUrl = `/orders/${order.accessToken}`;

  if (status === "captured" && payment) {
    if (payment.scenario === "webhookOnly") return Response.json({ status, redirectUrl: null, orderUrl });
    const params = new URLSearchParams({
      provider: "testpay",
      token: order.accessToken,
      ...signReturnPayload(config, {
        orderId,
        paymentId: payment.id,
        amountPaise: payment.amountPaise,
        method: payment.method,
      }),
    });
    return Response.json({ status, redirectUrl: `/checkout/return?${params}`, orderUrl });
  }

  if (status === "waiting" && (order.status !== "PENDING" || order.expiresAt < new Date())) {
    return Response.json({ status: "expired", orderUrl });
  }

  return Response.json({ status, orderUrl, paymentId: payment?.id ?? null });
}
