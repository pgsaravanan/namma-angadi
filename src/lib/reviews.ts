import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { isPaidStatus } from "./order-status";
import { MAX_STORIES } from "./promotions";

export const REVIEWABLE_STATUS = "DELIVERED";

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a star rating").max(5, "Choose a star rating"),
  comment: z.string().trim().min(3, "Write a few words about it").max(600, "Keep it under 600 characters"),
  customerName: z.string().trim().min(2, "Enter your name").max(60, "Keep your name short"),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export class ReviewError extends Error {}

export async function submitReview(shopId: string, orderToken: string, productId: string, input: ReviewInput) {
  const order = await db.order.findFirst({
    where: { shopId, accessToken: orderToken },
    include: { items: { select: { productId: true } } },
  });
  if (!order) throw new ReviewError("We couldn't find this order");
  if (order.status !== REVIEWABLE_STATUS) throw new ReviewError("You can review items once your order is delivered");
  if (!order.items.some((item) => item.productId === productId)) throw new ReviewError("This item isn't in your order");

  try {
    await db.productReview.create({
      data: { shopId, productId, orderId: order.id, ...input },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ReviewError("You've already reviewed this item. Thank you!");
    }
    throw error;
  }
}

export const FEEDBACK_MAX_LENGTH = 200;

export const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a star rating").max(5, "Choose a star rating"),
  comment: z.string().trim().max(FEEDBACK_MAX_LENGTH, `Keep it under ${FEEDBACK_MAX_LENGTH} characters`),
  customerName: z.string().trim().min(2, "Enter your name").max(60, "Keep your name short"),
  canPublish: z.boolean(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export async function submitOrderFeedback(shopId: string, orderToken: string, input: FeedbackInput) {
  const order = await db.order.findFirst({ where: { shopId, accessToken: orderToken }, select: { id: true, status: true } });
  if (!order) throw new ReviewError("We couldn't find this order");
  if (!isPaidStatus(order.status)) throw new ReviewError("You can share feedback once your order is placed");

  try {
    await db.orderFeedback.create({ data: { shopId, orderId: order.id, ...input } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ReviewError("You've already shared feedback for this order. Thank you!");
    }
    throw error;
  }
}

export async function publishOrderFeedback(shopId: string, feedbackId: string) {
  const feedback = await db.orderFeedback.findFirst({ where: { id: feedbackId, shopId } });
  if (!feedback) throw new ReviewError("Feedback not found");
  if (!feedback.canPublish) throw new ReviewError("This customer asked to keep their feedback private");
  if (feedback.comment.length < 3) throw new ReviewError("There's no comment to show on the shop");
  if (feedback.storyId) return;
  if ((await db.customerStory.count({ where: { shopId } })) >= MAX_STORIES) {
    throw new ReviewError(`Happy customers is full (${MAX_STORIES} posts). Delete an older one in Promotions first.`);
  }

  await db.$transaction(async (tx) => {
    const first = await tx.customerStory.aggregate({ where: { shopId }, _min: { position: true } });
    const story = await tx.customerStory.create({
      data: { shopId, caption: feedback.comment, customerName: feedback.customerName, position: (first._min.position ?? 1) - 1 },
    });
    const claimed = await tx.orderFeedback.updateMany({
      where: { id: feedback.id, storyId: null },
      data: { status: "APPROVED", storyId: story.id, reviewedAt: new Date() },
    });
    if (claimed.count === 0) throw new ReviewError("This feedback is already showing on the shop");
  });
}

export async function hideOrderFeedback(shopId: string, feedbackId: string) {
  const feedback = await db.orderFeedback.findFirst({ where: { id: feedbackId, shopId } });
  if (!feedback) return;
  await db.$transaction([
    ...(feedback.storyId ? [db.customerStory.deleteMany({ where: { id: feedback.storyId, shopId } })] : []),
    db.orderFeedback.update({ where: { id: feedback.id }, data: { status: "HIDDEN", storyId: null, reviewedAt: new Date() } }),
  ]);
}

export type RatingSummary = { average: number; count: number };

export async function ratingSummaries(shopId: string, productIds: string[]) {
  if (!productIds.length) return new Map<string, RatingSummary>();
  const rows = await db.productReview.groupBy({
    by: ["productId"],
    where: { shopId, productId: { in: productIds }, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  return new Map(rows.map((row) => [row.productId, { average: row._avg.rating ?? 0, count: row._count }]));
}

export async function withRatings<T extends { id: string }>(shopId: string, products: T[]) {
  const ratings = await ratingSummaries(shopId, products.map((product) => product.id));
  return products.map((product) => ({ ...product, rating: ratings.get(product.id) ?? null }));
}
