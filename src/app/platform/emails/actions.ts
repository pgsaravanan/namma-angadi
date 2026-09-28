"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/FormMessage";
import { requirePlatformAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function sendTestEmail(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requirePlatformAdmin();
  const parsed = z.email("Enter a valid email").safeParse(String(formData.get("to") ?? "").trim());
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await sendEmail({
    shopId: null,
    to: parsed.data,
    subject: "Namma Angadi test email",
    text: `Hi ${admin.name.split(" ")[0]},\n\nIf you can read this, order and invite emails are working.\n\nCheck whether it arrived in your Inbox, Promotions or Spam folder.`,
  });

  const result = await db.outboundEmail.findFirst({ where: { to: parsed.data }, orderBy: { createdAt: "desc" } });
  revalidatePath("/platform/emails");
  if (result?.status === "sent") return { success: `Sent to ${parsed.data}. Check your Inbox, Promotions and Spam folders.` };
  if (result?.status === "logged") return { error: "Email isn't set up on this server yet (BREVO_API_KEY or EMAIL_FROM is missing)." };
  return { error: `The email service refused it: ${result?.error ?? "unknown error"}` };
}
