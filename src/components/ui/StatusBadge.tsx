import type { OrderStatus } from "@/generated/prisma/enums";
import styles from "./StatusBadge.module.scss";

const TONES: Record<OrderStatus, string> = {
  PENDING: styles.warning,
  PAID: styles.success,
  SHIPPED: styles.info,
  DELIVERED: styles.success,
  FAILED: styles.danger,
  EXPIRED: styles.neutral,
  CANCELLED: styles.neutral,
  REFUNDED: styles.neutral,
};

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  FAILED: "Payment failed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`${styles.badge} ${TONES[status]}`}>{LABELS[status]}</span>;
}
