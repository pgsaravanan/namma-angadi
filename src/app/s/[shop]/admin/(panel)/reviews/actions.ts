"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { hideOrderFeedback, publishOrderFeedback, ReviewError } from "@/lib/reviews";

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

export async function publishFeedback(feedbackId: string) {
  const { shop } = await requireShopPermission("reviews:manage");
  try {
    await publishOrderFeedback(shop.id, feedbackId);
  } catch (error) {
    if (!(error instanceof ReviewError)) throw error;
    redirect(`/admin/reviews?tab=FEEDBACK&error=${encodeURIComponent(error.message)}`);
  }
  refresh();
}

export async function hideFeedback(feedbackId: string) {
  const { shop } = await requireShopPermission("reviews:manage");
  await hideOrderFeedback(shop.id, feedbackId);
  refresh();
}

export async function deleteFeedback(feedbackId: string) {
  const { shop } = await requireShopPermission("reviews:manage");
  await hideOrderFeedback(shop.id, feedbackId);
  await db.orderFeedback.deleteMany({ where: { id: feedbackId, shopId: shop.id } });
  refresh();
}
