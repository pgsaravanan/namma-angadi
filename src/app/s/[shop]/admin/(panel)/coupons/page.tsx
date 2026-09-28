import styles from "@/components/admin/AdminShell.module.scss";
import { CouponForm } from "@/components/admin/CouponForm";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { createCoupon, toggleCoupon } from "./actions";

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });

export default async function CouponsPage() {
  const { shop } = await requireShopPermission("coupons:manage");
  const coupons = await db.coupon.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className={styles.section}>
      <h1 className={styles.pageTitle}>Discounts</h1>

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>New coupon</h2>
        <CouponForm action={createCoupon} />
      </section>

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Coupons</h2>
        {coupons.length === 0 ? (
          <p className={ui.empty}>No coupons yet.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Conditions</th>
                  <th>Used</th>
                  <th>Valid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <strong>{coupon.code}</strong>
                    </td>
                    <td>
                      {coupon.type === "PERCENT" ? `${coupon.value}%` : formatPaise(coupon.value)}
                      {coupon.maxDiscountPaise !== null && (
                        <div className={ui.muted}>up to {formatPaise(coupon.maxDiscountPaise)}</div>
                      )}
                    </td>
                    <td>{coupon.minOrderPaise > 0 ? `Min ${formatPaise(coupon.minOrderPaise)}` : "—"}</td>
                    <td>
                      {coupon.usedCount}
                      {coupon.usageLimit !== null && ` / ${coupon.usageLimit}`}
                    </td>
                    <td>
                      {coupon.startsAt ? dateFormat.format(coupon.startsAt) : "Now"} –{" "}
                      {coupon.endsAt ? dateFormat.format(coupon.endsAt) : "No end"}
                    </td>
                    <td>
                      <form action={toggleCoupon.bind(null, coupon.id)}>
                        <button type="submit" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
                          {coupon.isActive ? "Turn off" : "Turn on"}
                        </button>
                      </form>
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
