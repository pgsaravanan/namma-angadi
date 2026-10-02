import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusPoller } from "@/components/store/OrderStatusPoller";
import { ReviewForm } from "@/components/store/ReviewForm";
import { Stars } from "@/components/store/Stars";
import { StatusBadge } from "@/components/ui/StatusBadge";
import ui from "@/components/ui/ui.module.scss";
import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { addressLines, formatIndianMobile } from "@/lib/india";
import { formatPaise } from "@/lib/money";
import { isPaidStatus } from "@/lib/order-status";
import { REVIEWABLE_STATUS } from "@/lib/reviews";
import { requireShop } from "@/lib/tenant";
import { reviewItem } from "./actions";
import storeStyles from "../../store.module.scss";
import styles from "./order.module.scss";
import { indiaDateTime } from "@/lib/dates";

export const metadata = { title: "Your order", robots: { index: false } };

const HEADLINES: Record<OrderStatus, string> = {
  PAID: "Your order is confirmed",
  PREPARING: "We're preparing your order",
  SHIPPED: "Your order is on the way",
  DELIVERED: "Your order has been delivered",
  PENDING: "We're confirming your payment…",
  FAILED: "Your payment did not go through",
  EXPIRED: "This order expired before payment was completed",
  CANCELLED: "This order was cancelled",
  REFUNDED: "This order has been refunded",
};

const NEXT_STEPS: Partial<Record<OrderStatus, string>> = {
  PAID: "We've received your order. We'll call you on your mobile number if we need anything.",
  PREPARING: "Your food is being freshly prepared.",
  SHIPPED: "Your parcel has left the shop and will reach you soon.",
  PENDING: "This page updates by itself as soon as your bank confirms the payment.",
  REFUNDED: "The money is on its way back to you. Banks usually take 5 to 7 working days.",
};

const METHOD_LABELS: Record<string, string> = { upi: "UPI", card: "Card", netbanking: "Netbanking", wallet: "Wallet" };


export default async function OrderPage({ params }: PageProps<"/s/[shop]/orders/[token]">) {
  const { token } = await params;
  const shop = await requireShop();
  const order = await db.order.findFirst({
    where: { shopId: shop.id, accessToken: token },
    include: {
      items: { include: { product: { select: { name: true, imageUrl: true } } } },
      coupon: true,
      payments: { orderBy: { createdAt: "desc" } },
      reviews: true,
    },
  });
  if (!order) notFound();

  const canReview = order.status === REVIEWABLE_STATUS;
  const reviewProducts = [...new Map(order.items.map((item) => [item.productId, item.product])).entries()];

  const payment = order.payments.find((candidate) => candidate.status === "captured" || candidate.status === "refunded");
  const isSuccess = isPaidStatus(order.status);
  const firstName = order.customerName.split(" ")[0];
  const isPickup = order.deliveryMethod === "pickup";
  const nextStep =
    isPickup && order.status === "SHIPPED" ? "Your order is ready. Please collect it from the shop." : NEXT_STEPS[order.status];
  const headline =
    isPickup && order.status === "SHIPPED"
      ? "Your order is ready for pickup"
      : isPickup && order.status === "DELIVERED"
        ? "You've picked up your order"
        : HEADLINES[order.status];

  return (
    <div className={`${storeStyles.container} ${styles.wrap}`}>
      {order.status === "PENDING" && <OrderStatusPoller />}

      <section className={`${ui.card} ${styles.hero}`}>
        {isSuccess && (
          <div className={styles.tick} aria-hidden>
            ✓
          </div>
        )}
        <div>
          <h1 className={styles.headline}>
            {isSuccess ? `Thank you, ${firstName}! ` : ""}
            {headline}
          </h1>
          <p className={ui.muted}>
            Order #{order.number} · placed {indiaDateTime.format(order.createdAt)}
          </p>
        </div>
        <StatusBadge status={order.status} deliveryMethod={order.deliveryMethod} />
      </section>

      {nextStep && <p className={styles.nextStep}>{nextStep}</p>}

      <div className={styles.grid}>
        <section className={ui.card}>
          <h2 className={styles.sectionTitle}>Items</h2>
          <ul className={styles.items}>
            {order.items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.name}
                  <span className={ui.muted}> × {item.quantity}</span>
                </span>
                <span>{formatPaise(item.unitPricePaise * item.quantity)}</span>
              </li>
            ))}
            <li className={ui.muted}>
              <span>Subtotal</span>
              <span>{formatPaise(order.subtotalPaise)}</span>
            </li>
            {order.discountPaise > 0 && (
              <li className={ui.muted}>
                <span>Discount{order.coupon && ` (${order.coupon.code})`}</span>
                <span>− {formatPaise(order.discountPaise)}</span>
              </li>
            )}
            <li className={ui.muted}>
              <span>{isPickup ? "Pickup" : "Delivery"}</span>
              <span>{order.deliveryFeePaise ? formatPaise(order.deliveryFeePaise) : "Free"}</span>
            </li>
            <li className={styles.total}>
              <span>Total</span>
              <span>{formatPaise(order.totalPaise)}</span>
            </li>
          </ul>
        </section>

        <div className={styles.side}>
          <section className={ui.card}>
            <h2 className={styles.sectionTitle}>{isPickup ? "Pickup from" : "Delivering to"}</h2>
            <p className={styles.block}>
              <strong>{isPickup ? shop.name : order.customerName}</strong>
              {isPickup
                ? shop.address && <span>{shop.address}</span>
                : addressLines(order).map((line) => <span key={line}>{line}</span>)}
            </p>
            <p className={`${styles.block} ${ui.muted}`}>
              <span>Mobile: {order.customerPhone}</span>
              {order.customerEmail && <span>Email: {order.customerEmail}</span>}
            </p>
          </section>

          <section className={ui.card}>
            <h2 className={styles.sectionTitle}>Payment</h2>
            {payment ? (
              <dl className={styles.details}>
                <dt>Paid with</dt>
                <dd>{METHOD_LABELS[payment.method ?? ""] ?? "Online payment"}</dd>
                <dt>Amount</dt>
                <dd>{formatPaise(payment.amountPaise)}</dd>
                {order.paidAt && (
                  <>
                    <dt>Paid on</dt>
                    <dd>{indiaDateTime.format(order.paidAt)}</dd>
                  </>
                )}
                <dt>Transaction ID</dt>
                <dd className={styles.reference}>{payment.providerPaymentId}</dd>
              </dl>
            ) : null}
            {order.invoiceNumber ? (
              <Link href={`/bill/${order.accessToken}`} className={`${ui.button} ${ui.secondary} ${ui.small} ${styles.billLink}`}>
                View bill
              </Link>
            ) : (
              !payment && <p className={ui.muted}>No payment received yet.</p>
            )}
          </section>
        </div>
      </div>

      {canReview && (
        <section id="reviews" className={ui.card}>
          <h2 className={styles.sectionTitle}>Rate your items</h2>
          <p className={ui.muted}>Your feedback helps {shop.name} and other customers. It means a lot to a small business.</p>
          <div className={styles.reviews}>
            {reviewProducts.map(([productId, product]) => {
              const review = order.reviews.find((candidate) => candidate.productId === productId);
              return (
                <div key={productId} className={styles.reviewItem}>
                  {review ? (
                    <>
                      <strong>{product.name}</strong>
                      <Stars value={review.rating} />
                      <p className={styles.reviewText}>{review.comment}</p>
                      <span className={ui.hint}>
                        {review.status === "APPROVED"
                          ? "Published on the shop. Thank you!"
                          : review.status === "PENDING"
                            ? "Thank you! It will appear on the shop once it has been checked."
                            : "Thank you for your feedback."}
                      </span>
                    </>
                  ) : (
                    <ReviewForm
                      action={reviewItem.bind(null, order.accessToken, productId)}
                      productName={product.name}
                      defaultName={firstName}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={`${ui.card} ${styles.help}`}>
        <div>
          <strong>Questions about your order?</strong>
          <p className={ui.muted}>
            Contact {shop.contactName ? `${shop.contactName} at ${shop.name}` : shop.name}
            {shop.supportPhone && ` on ${formatIndianMobile(shop.supportPhone)}`}
            {shop.supportEmail && ` or ${shop.supportEmail}`} and mention order #{order.number}. Keep this page link to
            check your order later.
          </p>
        </div>
        <Link href="/" className={`${ui.button} ${ui.secondary}`}>
          Continue shopping
        </Link>
      </section>
    </div>
  );
}
