import type { OrderStatus } from "@/generated/prisma/enums";
import { statusLabel } from "@/lib/order-status";
import styles from "./StatusBadge.module.scss";

const TONES: Record<OrderStatus, string> = {
  PENDING: styles.warning,
  PAID: styles.success,
  PREPARING: styles.info,
  SHIPPED: styles.info,
  DELIVERED: styles.success,
  FAILED: styles.danger,
  EXPIRED: styles.neutral,
  CANCELLED: styles.neutral,
  REFUNDED: styles.neutral,
};

export function StatusBadge({ status, deliveryMethod }: { status: OrderStatus; deliveryMethod?: string }) {
  return <span className={`${styles.badge} ${TONES[status]}`}>{statusLabel(status, deliveryMethod)}</span>;
}
