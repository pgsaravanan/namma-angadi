import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Invoice", robots: { index: false } };

export default async function AdminInvoicePage({ params }: PageProps<"/s/[shop]/admin/invoice/[id]">) {
  const { id } = await params;
  const { shop } = await requireShopPermission("orders:manage");
  const order = await db.order.findFirst({ where: { id, shopId: shop.id }, include: { items: true } });
  if (!order?.invoiceNumber) notFound();

  return <InvoiceDocument order={order} shop={shop} backHref={`/admin/orders/${order.id}`} />;
}
