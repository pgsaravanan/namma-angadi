"use server";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { expireOrderNow } from "@/lib/orders";
import { getShopPaymentConfig, isProviderEnabled, PaymentProviderError } from "@/lib/payments";
import { isSimulatorScenario, simulateUpiPayment } from "@/lib/payments/testpay";
import { originFromHeaders } from "@/lib/request";
import { requireShop } from "@/lib/tenant";

export async function respondToUpiRequest(providerOrderId: string, formData: FormData) {
  const shop = await requireShop();
  const config = getShopPaymentConfig(shop);
  if (!isProviderEnabled("testpay") || config?.provider !== "testpay") notFound();

  const order = await db.order.findFirst({ where: { shopId: shop.id, provider: "testpay", providerOrderId } });
  if (!order) notFound();

  const appPath = `/pay/test/${providerOrderId}/app`;
  const declined = formData.get("decision") === "decline";
  const scenario = formData.get("scenario");

  if (!declined && !/^\d{4,6}$/.test(String(formData.get("pin") ?? ""))) redirect(`${appPath}?error=pin`);

  if (!declined && scenario === "late") await expireOrderNow(shop.id, order.id);
  else if (order.status !== "PENDING") redirect(`${appPath}?error=expired`);

  try {
    await simulateUpiPayment(config, {
      providerOrderId,
      amountPaise: order.totalPaise,
      method: "upi",
      scenario: declined ? "decline" : isSimulatorScenario(scenario) ? scenario : "approve",
      origin: originFromHeaders(await headers()),
    });
  } catch (error) {
    if (error instanceof PaymentProviderError) redirect(`${appPath}?error=already`);
    throw error;
  }

  redirect(appPath);
}
