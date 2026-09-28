import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { db } from "@/lib/db";
import { isPaidStatus } from "@/lib/order-status";
import { requireShop } from "@/lib/tenant";

export const metadata = { title: "Bill", robots: { index: false } };

export default async function CustomerBillPage({ params }: PageProps<"/s/[shop]/bill/[token]">) {
  const { token } = await params;
  const shop = await requireShop();
  const order = await db.order.findFirst({ where: { shopId: shop.id, accessToken: token }, include: { items: true } });
  if (!order || !(isPaidStatus(order.status) || order.status === "REFUNDED") || !order.invoiceNumber) notFound();

  return <InvoiceDocument order={order} shop={shop} backHref={`/orders/${order.accessToken}`} />;
}
