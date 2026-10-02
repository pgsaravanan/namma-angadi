"use server";

import { revalidatePath } from "next/cache";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

export async function setReviewStatus(reviewId: string, status: ReviewStatus) {
  const { shop } = await requireShopPermission("reviews:manage");
  await db.productReview.updateMany({
    where: { id: reviewId, shopId: shop.id },
    data: { status, reviewedAt: new Date() },
  });
  refresh();
}

export async function deleteReview(reviewId: string) {
  const { shop } = await requireShopPermission("reviews:manage");
  await db.productReview.deleteMany({ where: { id: reviewId, shopId: shop.id } });
  refresh();
}
