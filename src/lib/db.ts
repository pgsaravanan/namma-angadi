import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Missing environment variable DATABASE_URL");

  const url = new URL(raw);
  const schema = url.searchParams.get("schema") ?? undefined;
  url.searchParams.delete("schema");
  url.searchParams.delete("pgbouncer");

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema }) });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
