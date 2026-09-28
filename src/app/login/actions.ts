"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/FormMessage";
import { createSession, destroySession } from "@/lib/auth";
import { authenticate } from "@/lib/login";

export async function loginToPlatform(_: FormState, formData: FormData): Promise<FormState> {
  const result = await authenticate(formData.get("email"), formData.get("password"));
  if ("error" in result) return { error: result.error };
  if (!result.user.isPlatformAdmin) return { error: "Invalid email or password" };

  await createSession(result.user.id, null);
  redirect("/platform");
}

export async function logoutFromPlatform() {
  await destroySession();
  redirect("/login");
}
