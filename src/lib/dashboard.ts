import "server-only";
import { db } from "./db";
import { PAID_STATUSES } from "./order-status";
import { isStockUnit, packsFromStock, productStock } from "./stock";

const LOW_STOCK = 3;

function isLowOnStock(product: {
  stock: number;
  stockUnit: string | null;
  variants: { stock: number; packAmount: number | null }[];
}) {
  if (!isStockUnit(product.stockUnit)) return productStock(product) <= LOW_STOCK;
  const smallestPack = Math.min(...product.variants.map((variant) => variant.packAmount ?? Infinity));
  return packsFromStock(product.stock, Number.isFinite(smallestPack) ? smallestPack : null) <= LOW_STOCK;
}

export async function getDashboardStats(shopId: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [revenue, toShip, lowStock, needsAttention, recent] = await Promise.all([
    db.order.aggregate({
      where: { shopId, status: { in: [...PAID_STATUSES] }, paidAt: { gte: since } },
      _sum: { totalPaise: true },
      _count: true,
    }),
    db.order.count({ where: { shopId, status: { in: ["PAID", "PREPARING"] } } }),
    db.product
      .findMany({
        where: { shopId, isActive: true },
        select: { stock: true, stockUnit: true, variants: { select: { stock: true, packAmount: true } } },
      })
      .then((products) => products.filter(isLowOnStock).length),
    db.order.count({ where: { shopId, attentionNote: { not: null } } }),
    db.order.findMany({ where: { shopId }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return { revenue, toShip, lowStock, needsAttention, recent };
}
