import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/admin/AdminShell.module.scss";
import { OrderActions } from "@/components/admin/OrderActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { addressLines } from "@/lib/india";
import { formatPaise } from "@/lib/money";
import { nextStatuses } from "@/lib/orders";
import { isPaidStatus } from "@/lib/order-status";
import { can } from "@/lib/permissions";
import { env } from "@/lib/env";
import { shopBaseUrl } from "@/lib/host";
import { reviewRequestWhatsAppUrl } from "@/lib/review-requests";
import { cancelOrder, refundFullOrder, updateOrderStatus } from "../actions";
import { indiaDateTime } from "@/lib/dates";


export default async function OrderDetailPage({ params }: PageProps<"/s/[shop]/admin/orders/[id]">) {
  const { id } = await params;
  const { shop, staff } = await requireShopPermission("orders:manage");
  const order = await db.order.findFirst({
    where: { id, shopId: shop.id },
    include: { items: true, coupon: true, payments: true, refunds: true },
  });
  if (!order) notFound();

  const refundable =
    can(staff.role, "orders:refund") &&
    isPaidStatus(order.status) &&
    order.payments.some((payment) => payment.status === "captured");

  return (
    <div className={styles.section}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Order #{order.number}</h1>
          <p className={ui.muted}>Placed {indiaDateTime.format(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
      </div>

      {order.attentionNote && (
        <p role="alert" className={`${ui.message} ${ui.error}`}>
          {order.attentionNote}
        </p>
      )}

      <OrderActions
        nextStatuses={nextStatuses(order.status)}
        deliveryMethod={order.deliveryMethod}
        updateStatus={updateOrderStatus.bind(null, order.id)}
        cancel={order.status === "PENDING" ? cancelOrder.bind(null, order.id) : undefined}
        refund={refundable ? refundFullOrder.bind(null, order.id) : undefined}
        refundLabel={`Refund ${formatPaise(order.totalPaise)}`}
      />

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Items</h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{formatPaise(item.unitPricePaise)}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPaise(item.unitPricePaise * item.quantity)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3}>Subtotal</td>
                <td>{formatPaise(order.subtotalPaise)}</td>
              </tr>
              {order.discountPaise > 0 && (
                <tr>
                  <td colSpan={3}>Discount {order.coupon && `(${order.coupon.code})`}</td>
                  <td>− {formatPaise(order.discountPaise)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={3}>{order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}</td>
                <td>{order.deliveryFeePaise ? formatPaise(order.deliveryFeePaise) : "Free"}</td>
              </tr>
              <tr>
                <th colSpan={3}>Total</th>
                <th>{formatPaise(order.totalPaise)}</th>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.stats}>
        <section className={ui.card}>
          <h2 className={styles.cardTitle}>Customer</h2>
          <p>
            {order.customerName}
            <br />
            {order.customerPhone}
            {order.customerEmail && (
              <>
                <br />
                {order.customerEmail}
              </>
            )}
          </p>
          {order.status === "DELIVERED" &&
            (order.reviewRequests ? (
              <a
                href={reviewRequestWhatsAppUrl({
                  shopName: shop.name,
                  customerName: order.customerName,
                  phone: order.customerPhone,
                  orderUrl: `${shopBaseUrl(shop.slug, env.rootDomain, shop.customDomain)}/orders/${order.accessToken}`,
                })}
                className={`${ui.button} ${ui.secondary} ${ui.small}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ask for a review on WhatsApp
              </a>
            ) : (
              <p className={ui.hint}>The customer didn&apos;t opt in to review requests.</p>
            ))}
          <h2 className={styles.cardTitle}>{order.deliveryMethod === "pickup" ? "Pickup" : "Delivery address"}</h2>
          {order.deliveryMethod === "pickup" ? (
            <p className={ui.muted}>Customer will collect from the shop.</p>
          ) : (
            <p className={ui.muted}>
              {addressLines(order).map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          )}
          {order.invoiceNumber && (
            <Link href={`/admin/invoice/${order.id}`} className={`${ui.button} ${ui.secondary} ${ui.small}`}>
              Print bill
            </Link>
          )}
        </section>

        <section className={ui.card}>
          <h2 className={styles.cardTitle}>Payment</h2>
          {order.payments.length === 0 ? (
            <p className={ui.muted}>No payment received.</p>
          ) : (
            order.payments.map((payment) => (
              <p key={payment.id}>
                {formatPaise(payment.amountPaise)} via {payment.method?.toUpperCase() ?? "online"} ({payment.status})
                <br />
                <span className={ui.hint}>{payment.provider} · {payment.providerPaymentId}</span>
              </p>
            ))
          )}
          {order.refunds.map((refund) => (
            <p key={refund.id}>
              Refund {formatPaise(refund.amountPaise)} ({refund.status})
              <br />
              <span className={ui.hint}>{refund.providerRefundId}</span>
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}
