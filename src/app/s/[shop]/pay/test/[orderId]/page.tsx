import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { UpiGateway } from "@/components/store/UpiGateway";
import { db } from "@/lib/db";
import { getShopPaymentConfig, isProviderEnabled } from "@/lib/payments";
import { simulatorVpa } from "@/lib/payments/testpay";
import { originFromHeaders } from "@/lib/request";
import { requireShop } from "@/lib/tenant";

export const metadata = { title: "UPI Simulator", robots: { index: false } };

export default async function UpiGatewayPage({ params }: PageProps<"/s/[shop]/pay/test/[orderId]">) {
  const { orderId } = await params;
  const shop = await requireShop();
  if (!isProviderEnabled("testpay") || getShopPaymentConfig(shop)?.provider !== "testpay") notFound();

  const order = await db.order.findFirst({ where: { shopId: shop.id, provider: "testpay", providerOrderId: orderId } });
  if (!order) notFound();

  const appPath = `/pay/test/${orderId}/app`;
  const appUrl = `${originFromHeaders(await headers())}${appPath}`;
  const qrDataUrl = await QRCode.toDataURL(appUrl, { margin: 1, width: 440 });

  return (
    <UpiGateway
      orderId={orderId}
      shopName={shop.name}
      orderNumber={order.number}
      amountPaise={order.totalPaise}
      vpa={simulatorVpa(shop.slug)}
      appPath={appPath}
      qrDataUrl={qrDataUrl}
      expiresAt={order.expiresAt.toISOString()}
    />
  );
}
