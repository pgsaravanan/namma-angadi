import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { randomToken, sha256 } from "./crypto";
import { db } from "./db";
import { env } from "./env";
import { hashPassword, verifyPassword } from "./password";

const CUSTOMER_COOKIE = "na_customer";
const SESSION_DAYS = 60;

export async function createCustomerSession(accountId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.customerSession.create({ data: { id: sha256(token), accountId, expiresAt } });
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroyCustomerSession() {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (token) await db.customerSession.deleteMany({ where: { id: sha256(token) } });
  store.delete(CUSTOMER_COOKIE);
}

export const getCustomerAccount = cache(async (shopId: string) => {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const session = await db.customerSession.findUnique({ where: { id: sha256(token) }, include: { account: true } });
  if (!session || session.expiresAt < new Date() || session.account.shopId !== shopId) return null;
  return session.account;
});

export class AccountError extends Error {}

type Registration = {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: { line1: string; line2?: string; city: string; state: string; pincode: string };
};

export async function registerCustomer(shopId: string, input: Registration) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.customerAccount.findUnique({ where: { shopId_email: { shopId, email } } });
  if (existing) throw new AccountError("An account with this email already exists. Please sign in instead.");

  return db.customerAccount.create({
    data: {
      shopId,
      email,
      name: input.name,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      ...(input.address && {
        addressLine1: input.address.line1,
        addressLine2: input.address.line2 || null,
        city: input.address.city,
        state: input.address.state,
        pincode: input.address.pincode,
      }),
    },
  });
}

let dummyHash: Promise<string> | null = null;

export async function authenticateCustomer(shopId: string, emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  const account = await db.customerAccount.findUnique({ where: { shopId_email: { shopId, email } } });
  dummyHash ??= hashPassword("namma-angadi-timing-guard");
  const valid = await verifyPassword(password, account?.passwordHash ?? (await dummyHash));
  return account && valid ? account : null;
}
