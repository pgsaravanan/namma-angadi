"use server";

import type { FormState } from "@/components/ui/FormMessage";
import { contactSchema } from "@/lib/contact";
import { db } from "@/lib/db";
import { notifyContactMessage } from "@/lib/notifications";
import { requireShop } from "@/lib/tenant";

const LIMIT_PER_HOUR = 3;

export async function sendContactMessage(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  if (String(formData.get("website") ?? "")) return { success: "Thank you! We'll get back to you soon." };

  const parsed = contactSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    topic: formData.get("topic") ?? "",
    orderNumber: formData.get("orderNumber") ?? "",
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { name, phone, email, topic, orderNumber, message } = parsed.data;
  const recent = await db.contactMessage.count({
    where: { shopId: shop.id, phone, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= LIMIT_PER_HOUR) {
    return { error: "We've already received your messages. We'll reply soon, or you can call or WhatsApp us." };
  }

  const saved = await db.contactMessage.create({
    data: { shopId: shop.id, name, phone, email: email || null, topic, orderNumber: orderNumber || null, message },
  });
  notifyContactMessage(saved.id);
  return { success: `Thank you, ${name.split(" ")[0]}! Your message has reached ${shop.name}. We'll get back to you soon.` };
}
