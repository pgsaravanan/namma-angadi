import "server-only";
import type { Shop } from "@/generated/prisma/client";
import type { ShopRole } from "@/generated/prisma/enums";
import { randomToken } from "./crypto";
import { db } from "./db";
import { sendEmail } from "./email";
import { env } from "./env";
import { shopBaseUrl } from "./host";
import { hashPassword } from "./password";
import { createResetToken } from "./password-reset";
import { ROLE_LABELS } from "./permissions";

type InviteShop = Pick<Shop, "id" | "name" | "slug" | "customDomain">;

export type InviteResult =
  | { status: "invited"; link: string | null }
  | { status: "added" }
  | { status: "already-member" };

export function shopAdminUrl(shop: InviteShop) {
  return `${shopBaseUrl(shop.slug, env.rootDomain, shop.customDomain)}/admin`;
}

export async function createInviteLink(shop: InviteShop, userId: string) {
  const token = await createResetToken({ userId }, "invite");
  return `${shopAdminUrl(shop)}/welcome/${token}`;
}

async function sendInviteEmail(shop: InviteShop, to: string, name: string, role: ShopRole, link: string, invitedBy: string) {
  await sendEmail({
    shopId: shop.id,
    senderName: shop.name,
    to,
    subject: `You're invited to manage ${shop.name}`,
    text: [
      `Hi ${name.split(" ")[0]},`,
      "",
      `${invitedBy} has added you as ${ROLE_LABELS[role]} of ${shop.name} on Namma Angadi.`,
      "",
      "Choose your password here (the link works for 7 days):",
      link,
      "",
      `After that, sign in any time at ${shopAdminUrl(shop)}`,
    ].join("\n"),
  });
}

async function belongsToOtherShops(userId: string, shopId: string) {
  return (await db.membership.count({ where: { userId, shopId: { not: shopId } } })) > 0;
}

export async function inviteToShop(input: {
  shop: InviteShop;
  name: string;
  email: string;
  role: ShopRole;
  invitedBy: string;
  byPlatformAdmin?: boolean;
}): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({
    where: { email },
    include: { memberships: { where: { shopId: input.shop.id } } },
  });
  if (existing?.memberships.length) return { status: "already-member" };

  if (existing?.passwordSetAt) {
    await db.membership.create({ data: { shopId: input.shop.id, userId: existing.id, role: input.role } });
    await sendEmail({
      shopId: input.shop.id,
      senderName: input.shop.name,
      to: email,
      subject: `You now have access to ${input.shop.name}`,
      text: `Hi ${existing.name.split(" ")[0]},\n\n${input.invitedBy} has added you as ${ROLE_LABELS[input.role]} of ${input.shop.name}.\nSign in with your usual password at ${shopAdminUrl(input.shop)}`,
    });
    return { status: "added" };
  }

  const user = existing
    ? await db.user.update({ where: { id: existing.id }, data: { name: input.name } })
    : await db.user.create({
        data: { email, name: input.name, passwordHash: await hashPassword(randomToken(32)), passwordSetAt: null },
      });
  const reveal = input.byPlatformAdmin || !(await belongsToOtherShops(user.id, input.shop.id));
  await db.membership.create({ data: { shopId: input.shop.id, userId: user.id, role: input.role } });

  const link = await createInviteLink(input.shop, user.id);
  await sendInviteEmail(input.shop, email, user.name, input.role, link, input.invitedBy);
  return { status: "invited", link: reveal ? link : null };
}

export async function resendInvite(shop: InviteShop, userId: string, invitedBy: string, byPlatformAdmin = false) {
  const membership = await db.membership.findUnique({
    where: { shopId_userId: { shopId: shop.id, userId } },
    include: { user: true },
  });
  if (!membership || membership.user.passwordSetAt) return null;

  const link = await createInviteLink(shop, userId);
  await sendInviteEmail(shop, membership.user.email, membership.user.name, membership.role, link, invitedBy);
  const reveal = byPlatformAdmin || !(await belongsToOtherShops(userId, shop.id));
  return { link: reveal ? link : null };
}
