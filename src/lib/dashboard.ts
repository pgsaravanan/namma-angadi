import "server-only";
import { db } from "./db";
import { PAID_STATUSES } from "./order-status";

const LOW_STOCK = 3;

export async function getDashboardStats(shopId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [revenue, toShip, lowStock, needsAttention, recent] = await Promise.all([
    db.order.aggregate({
      where: { shopId, status: { in: [...PAID_STATUSES] }, paidAt: { gte: since } },
      _sum: { totalPaise: true },
      _count: true,
    }),
    db.order.count({ where: { shopId, status: "PAID" } }),
    db.product.count({ where: { shopId, isActive: true, stock: { lte: LOW_STOCK } } }),
    db.order.count({ where: { shopId, attentionNote: { not: null } } }),
    db.order.findMany({ where: { shopId }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return { revenue, toShip, lowStock, needsAttention, recent };
}
