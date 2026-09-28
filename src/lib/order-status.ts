import type { OrderStatus } from "@/generated/prisma/enums";

export const PAID_STATUSES = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] as const satisfies readonly OrderStatus[];

export function isPaidStatus(status: OrderStatus) {
  return (PAID_STATUSES as readonly OrderStatus[]).includes(status);
}

export type DeliveryMethodName = "delivery" | "pickup";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  PAID: "Confirmed",
  PREPARING: "Preparing",
  SHIPPED: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Payment failed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export function statusLabel(status: OrderStatus, deliveryMethod: string = "delivery") {
  if (deliveryMethod === "pickup" && status === "SHIPPED") return "Ready for pickup";
  if (deliveryMethod === "pickup" && status === "DELIVERED") return "Picked up";
  return STATUS_LABELS[status];
}
