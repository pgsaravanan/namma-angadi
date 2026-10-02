"use server";

import { revalidatePath } from "next/cache";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";

export async function setMessageReplied(messageId: string, replied: boolean) {
  const { shop } = await requireShopPermission("messages:manage");
  await db.contactMessage.updateMany({
    where: { id: messageId, shopId: shop.id },
    data: { repliedAt: replied ? new Date() : null },
  });
  revalidatePath("/admin", "layout");
}

export async function deleteMessage(messageId: string) {
  const { shop } = await requireShopPermission("messages:manage");
  await db.contactMessage.deleteMany({ where: { id: messageId, shopId: shop.id } });
  revalidatePath("/admin", "layout");
}
