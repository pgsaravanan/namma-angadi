import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "./db";
import { env } from "./env";
import { resolveHost } from "./host";

export const getRequestShop = cache(async () => {
  const host = (await headers()).get("host") ?? "";
  const target = resolveHost(host, env.rootDomain);
  if (target.kind !== "shop") return null;

  return db.shop.findFirst({
    where: { OR: [{ slug: target.key }, { customDomain: target.key }] },
  });
});

export async function getActiveShop() {
  const shop = await getRequestShop();
  return shop?.status === "ACTIVE" ? shop : null;
}

export async function requireShop() {
  const shop = await getRequestShop();
  if (!shop) notFound();
  return shop;
}
