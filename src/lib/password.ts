import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":").map((part) => Buffer.from(part, "base64"));
  if (!salt?.length || !hash?.length) return false;
  const candidate = await scryptAsync(password, salt, hash.length);
  return timingSafeEqual(candidate, hash);
}
