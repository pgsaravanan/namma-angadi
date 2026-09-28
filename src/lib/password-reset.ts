import "server-only";
import { randomToken, sha256 } from "./crypto";
import { db } from "./db";
import { hashPassword } from "./password";

const RESET_MINUTES = 60;
const INVITE_DAYS = 7;

type Target = { userId: string } | { customerAccountId: string };

export type TokenPurpose = "reset" | "invite";

export async function createResetToken(target: Target, purpose: TokenPurpose = "reset") {
  const token = randomToken(24);
  await db.passwordResetToken.deleteMany({ where: { ...target, purpose, usedAt: null } });
  await db.passwordResetToken.create({
    data: {
      id: sha256(token),
      ...target,
      purpose,
      expiresAt: new Date(Date.now() + (purpose === "invite" ? INVITE_DAYS * 24 * 60 : RESET_MINUTES) * 60 * 1000),
    },
  });
  return token;
}

export async function findValidResetToken(token: string, purpose: TokenPurpose) {
  const record = await db.passwordResetToken.findUnique({ where: { id: sha256(token) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}

export async function consumeResetToken(token: string, newPassword: string, purpose: TokenPurpose) {
  const record = await findValidResetToken(token, purpose);
  if (!record) return null;

  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    const owner = record.userId ? { userId: record.userId } : { customerAccountId: record.customerAccountId };
    await tx.passwordResetToken.deleteMany({ where: { ...owner, usedAt: null } });
    if (record.userId) {
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash, passwordSetAt: new Date() } });
      await tx.session.deleteMany({ where: { userId: record.userId } });
    }
    if (record.customerAccountId) {
      await tx.customerAccount.update({ where: { id: record.customerAccountId }, data: { passwordHash } });
      await tx.customerSession.deleteMany({ where: { accountId: record.customerAccountId } });
    }
  });
  return record;
}
