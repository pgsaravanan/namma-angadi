import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

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

export type RatingSummary = { average: number; count: number };

export async function ratingSummaries(productIds: string[]) {
  if (!productIds.length) return new Map<string, RatingSummary>();
  const rows = await db.productReview.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  return new Map(rows.map((row) => [row.productId, { average: row._avg.rating ?? 0, count: row._count }]));
}

export async function withRatings<T extends { id: string }>(products: T[]) {
  const ratings = await ratingSummaries(products.map((product) => product.id));
  return products.map((product) => ({ ...product, rating: ratings.get(product.id) ?? null }));
}
