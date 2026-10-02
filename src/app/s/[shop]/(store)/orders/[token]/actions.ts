"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/FormMessage";
import { feedbackSchema, ReviewError, reviewSchema, submitOrderFeedback, submitReview } from "@/lib/reviews";
import { requireShop } from "@/lib/tenant";

export async function reviewItem(orderToken: string, productId: string, _: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating") ?? 0,
    comment: formData.get("comment") ?? "",
    customerName: formData.get("customerName") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await submitReview(shop.id, orderToken, productId, parsed.data);
  } catch (error) {
    if (error instanceof ReviewError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/orders/${orderToken}`);
  return { success: "Thank you! Your review will appear on the shop once it has been checked." };
}

export async function sendOrderFeedback(orderToken: string, _: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const parsed = feedbackSchema.safeParse({
    rating: formData.get("rating") ?? 0,
    comment: formData.get("comment") ?? "",
    customerName: formData.get("customerName") ?? "",
    canPublish: formData.get("canPublish") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await submitOrderFeedback(shop.id, orderToken, parsed.data);
  } catch (error) {
    if (error instanceof ReviewError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/orders/${orderToken}`);
  return { success: `Thank you for your feedback! It helps ${shop.name} a lot.` };
}
