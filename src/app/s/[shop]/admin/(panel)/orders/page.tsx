import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import { StatusBadge } from "@/components/ui/StatusBadge";
import ui from "@/components/ui/ui.module.scss";
import { OrderStatus } from "@/generated/prisma/enums";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { releaseExpiredOrders } from "@/lib/orders";
import { indiaDateTime } from "@/lib/dates";

const FILTERS: { label: string; status?: OrderStatus }[] = [
  { label: "All" },
  { label: "New", status: "PAID" },
  { label: "Preparing", status: "PREPARING" },
  { label: "Out / ready", status: "SHIPPED" },
  { label: "Awaiting payment", status: "PENDING" },
  { label: "Refunded", status: "REFUNDED" },
];


export default async function OrdersPage({ searchParams }: PageProps<"/s/[shop]/admin/orders">) {
  const { shop } = await requireShopPermission("orders:manage");
  const { status: rawStatus, attention } = await searchParams;
  const status = typeof rawStatus === "string" && rawStatus in OrderStatus ? (rawStatus as OrderStatus) : undefined;

  await releaseExpiredOrders(shop.id, { force: true });
  const orders = await db.order.findMany({
    where: {
      shopId: shop.id,
      ...(status && { status }),
      ...(attention === "1" && { attentionNote: { not: null } }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className={styles.section}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Orders</h1>
        <div className={styles.actions}>
          {FILTERS.map((filter) => (
            <Link
              key={filter.label}
              href={filter.status ? `/admin/orders?status=${filter.status}` : "/admin/orders"}
              className={`${ui.button} ${ui.small} ${filter.status === status ? "" : ui.secondary}`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>
      <section className={ui.card}>
        {orders.length === 0 ? (
          <p className={ui.empty}>No orders here.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`}>#{order.number}</Link>
                    </td>
                    <td>{indiaDateTime.format(order.createdAt)}</td>
                    <td>
                      {order.customerName}
                      <div className={ui.muted}>{order.customerPhone}</div>
                    </td>
                    <td>{formatPaise(order.totalPaise)}</td>
                    <td>
                      <StatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
                      {order.attentionNote && <div className={ui.hint}>Needs attention</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
