import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/store/AccountForms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import ui from "@/components/ui/ui.module.scss";
import { getCustomerAccount } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { isPaidStatus } from "@/lib/order-status";
import { requireShop } from "@/lib/tenant";
import styles from "../store.module.scss";
import { signOut, updateProfile } from "./actions";
import { indiaDate } from "@/lib/dates";

export const metadata = { title: "My account", robots: { index: false } };


export default async function AccountPage() {
  const shop = await requireShop();
  const account = await getCustomerAccount(shop.id);
  if (!account) redirect("/account/login");

  const orders = await db.order.findMany({
    where: { shopId: shop.id, customerAccountId: account.id, status: { notIn: ["PENDING", "EXPIRED", "FAILED"] } },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { name: true, quantity: true } } },
    take: 50,
  });

  return (
    <div className={styles.container}>
      <div className={styles.sectionHeader}>
        <h1 className={styles.title}>Hi, {account.name.split(" ")[0]}</h1>
        <form action={signOut}>
          <button type="submit" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
            Sign out
          </button>
        </form>
      </div>
      <div className={styles.accountGrid}>
        <section className={ui.card}>
          <h2 className={styles.cardTitle}>Your orders</h2>
          {orders.length === 0 ? (
            <p className={ui.empty}>
              No orders yet. <Link href="/products">Start shopping</Link>
            </p>
          ) : (
            orders.map((order) => (
              <div key={order.id} className={styles.orderRow}>
                <div>
                  <Link href={`/orders/${order.accessToken}`}>
                    <strong>Order #{order.number}</strong>
                  </Link>
                  <div className={ui.hint}>
                    {indiaDate.format(order.createdAt)} ·{" "}
                    {order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ").slice(0, 80)}
                  </div>
                </div>
                <div className={styles.orderRowEnd}>
                  <strong>{formatPaise(order.totalPaise)}</strong>
                  <StatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
                  {isPaidStatus(order.status) && (
                    <Link href={`/bill/${order.accessToken}`} className={ui.hint}>
                      Bill
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
        <section className={ui.card}>
          <h2 className={styles.cardTitle}>Your details</h2>
          <p className={ui.hint}>{account.email}</p>
          <ProfileForm action={updateProfile} profile={account} />
        </section>
      </div>
    </div>
  );
}
