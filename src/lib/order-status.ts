import type { OrderStatus } from "@/generated/prisma/enums";

export const PAID_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const satisfies readonly OrderStatus[];

export function isPaidStatus(status: OrderStatus) {
  return (PAID_STATUSES as readonly OrderStatus[]).includes(status);
}
