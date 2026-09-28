import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { clientIpFrom, isRateLimited } from "./request";

let dummyHash: Promise<string> | null = null;

export async function authenticate(emailInput: FormDataEntryValue | null, passwordInput: FormDataEntryValue | null) {
  const email = String(emailInput ?? "").trim().toLowerCase();
  const password = String(passwordInput ?? "");
  if (!email || !password) return { error: "Enter your email and password" } as const;

  const ip = clientIpFrom(await headers());
  if (isRateLimited(`login:${ip}:${email}`, 8, 15 * 60_000)) {
    return { error: "Too many attempts. Please try again in 15 minutes." } as const;
  }

  const user = await db.user.findUnique({ where: { email } });
  dummyHash ??= hashPassword("namma-angadi-timing-guard");
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  if (!user || !valid) return { error: "Invalid email or password" } as const;

  return { user } as const;
}
