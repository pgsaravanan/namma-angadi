"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/FormMessage";
import { createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { authenticate } from "@/lib/login";
import { requireShop } from "@/lib/tenant";

export async function loginToShop(_: FormState, formData: FormData): Promise<FormState> {
  const shop = await requireShop();
  const result = await authenticate(formData.get("email"), formData.get("password"));
  if ("error" in result) return { error: result.error };

  const { user } = result;
  const isMember =
    user.isPlatformAdmin ||
    (await db.membership.findUnique({ where: { shopId_userId: { shopId: shop.id, userId: user.id } } }));
  if (!isMember) return { error: "Invalid email or password" };

  await createSession(user.id, shop.id);
  redirect("/admin");
}

export async function logoutFromShop() {
  await destroySession();
  redirect("/admin/login");
}
