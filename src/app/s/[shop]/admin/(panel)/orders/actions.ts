"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/FormMessage";
import { OrderStatus } from "@/generated/prisma/enums";
import { requireShopPermission } from "@/lib/auth";
import { advanceOrderStatus, cancelPendingOrder, refundOrder } from "@/lib/orders";
import { PaymentProviderError } from "@/lib/payments";

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function updateOrderStatus(orderId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { shop } = await requireShopPermission("orders:manage");
  const status = String(formData.get("status"));
  if (!(status in OrderStatus)) return { error: "Unknown status" };

  try {
    await advanceOrderStatus(shop.id, orderId, status as OrderStatus);
  } catch (error) {
    return { error: toMessage(error) };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: "Order updated" };
}

export async function cancelOrder(orderId: string): Promise<FormState> {
  const { shop } = await requireShopPermission("orders:manage");
  try {
    await cancelPendingOrder(shop.id, orderId);
  } catch (error) {
    return { error: toMessage(error) };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: "Order cancelled and stock returned" };
}

export async function refundFullOrder(orderId: string): Promise<FormState> {
  const { shop, staff } = await requireShopPermission("orders:refund");
  try {
    await refundOrder(shop, orderId, staff.user.id);
  } catch (error) {
    console.error("Refund failed", { orderId, error });
    return { error: error instanceof PaymentProviderError ? `Payment provider: ${error.message}` : toMessage(error) };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: "Refund started. The customer usually gets the money in 5 to 7 working days." };
}
