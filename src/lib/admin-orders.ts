import "server-only";
import { db } from "./db";

export async function newOrderSnapshot(shopId: string) {
  const [latest, toPrepare] = await Promise.all([
    db.order.findFirst({
      where: { shopId, paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      select: { id: true, number: true, totalPaise: true, customerName: true },
    }),
    db.order.count({ where: { shopId, status: "PAID" } }),
  ]);
  return { latest, toPrepare };
}
