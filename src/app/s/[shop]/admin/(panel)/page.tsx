import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import { StatusBadge } from "@/components/ui/StatusBadge";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard";
import { getShopPaymentConfig } from "@/lib/payments";
import { formatPaise } from "@/lib/money";
import { can } from "@/lib/permissions";

export default async function DashboardPage() {
  const { shop, staff } = await requireShopPermission("dashboard:view");
  const { revenue, toShip, lowStock, needsAttention, recent } = await getDashboardStats(shop.id);

  const paymentsReady = getShopPaymentConfig(shop) !== null;

  return (
    <div className={styles.section}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
      </div>

      {!paymentsReady && (
        <div className={`${ui.message} ${ui.error}`}>
          Online payments are not set up yet.{" "}
          {can(staff.role, "settings:manage") ? (
            <Link href="/admin/settings">Choose a payment provider</Link>
          ) : (
            "Ask your shop's super admin to set up payments."
          )}
        </div>
      )}

      {needsAttention > 0 && (
        <div className={`${ui.message} ${ui.error}`}>
          {needsAttention === 1 ? "1 order needs" : `${needsAttention} orders need`} your attention.{" "}
          <Link href="/admin/orders?attention=1">Review them</Link>
        </div>
      )}

      <div className={styles.stats}>
        <div className={ui.card}>
          <div className={styles.statLabel}>Sales, last 30 days</div>
          <div className={styles.statValue}>{formatPaise(revenue._sum.totalPaise ?? 0)}</div>
        </div>
        <div className={ui.card}>
          <div className={styles.statLabel}>Paid orders, last 30 days</div>
          <div className={styles.statValue}>{revenue._count}</div>
        </div>
        <div className={ui.card}>
          <div className={styles.statLabel}>Waiting to ship</div>
          <div className={styles.statValue}>{toShip}</div>
        </div>
        <div className={ui.card}>
          <div className={styles.statLabel}>Low on stock</div>
          <div className={styles.statValue}>{lowStock}</div>
        </div>
      </div>

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Recent orders</h2>
        {recent.length === 0 ? (
          <p className={ui.empty}>No orders yet.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`}>#{order.number}</Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td>{formatPaise(order.totalPaise)}</td>
                    <td>
                      <StatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
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
