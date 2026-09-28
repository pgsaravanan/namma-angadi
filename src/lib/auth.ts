import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ShopRole } from "@/generated/prisma/enums";
import { randomToken, sha256 } from "./crypto";
import { db } from "./db";
import { env } from "./env";
import { can, type Permission } from "./permissions";
import { requireShop } from "./tenant";

const SESSION_COOKIE = "na_session";
const SESSION_DAYS = 14;

export async function createSession(userId: string, shopId: string | null) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: sha256(token), userId, shopId, expiresAt } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  store.delete(SESSION_COOKIE);
}

export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session;
});

export type ShopStaff = {
  user: { id: string; name: string; email: string; isPlatformAdmin: boolean };
  role: ShopRole;
};

export const getShopStaff = cache(async (shopId: string): Promise<ShopStaff | null> => {
  const session = await getSession();
  if (!session || session.shopId !== shopId) return null;

  const { user } = session;
  if (user.isPlatformAdmin) return { user, role: "SUPER_ADMIN" };

  const membership = await db.membership.findUnique({ where: { shopId_userId: { shopId, userId: user.id } } });
  return membership ? { user, role: membership.role } : null;
});

export async function requireShopPermission(permission: Permission) {
  const shop = await requireShop();
  const staff = await getShopStaff(shop.id);
  if (!staff) redirect("/admin/login");
  if (!can(staff.role, permission)) redirect("/admin");
  return { shop, staff };
}

export async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session || session.shopId !== null || !session.user.isPlatformAdmin) redirect("/login");
  return session.user;
}
