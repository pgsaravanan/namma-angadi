import "server-only";
import type { Shop } from "@/generated/prisma/client";
import { decryptSecret } from "./crypto";

const CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php";
const TIMEOUT_MS = 10_000;

type AlertShop = Pick<Shop, "alertWhatsapp" | "alertWhatsappKeyEnc">;

export function whatsappAlertsReady(shop: AlertShop) {
  return Boolean(shop.alertWhatsapp && shop.alertWhatsappKeyEnc);
}

export async function sendWhatsappAlert(shop: AlertShop, text: string) {
  if (!shop.alertWhatsapp || !shop.alertWhatsappKeyEnc) return false;
  try {
    const url = new URL(CALLMEBOT_URL);
    url.searchParams.set("phone", `+91${shop.alertWhatsapp}`);
    url.searchParams.set("text", text);
    url.searchParams.set("apikey", decryptSecret(shop.alertWhatsappKeyEnc));
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body = await response.text();
    const ok = response.ok && !/error|invalid|not\s+allowed/i.test(body);
    if (!ok) console.error("WhatsApp alert failed", response.status, body.slice(0, 200));
    return ok;
  } catch (error) {
    console.error("WhatsApp alert failed", error instanceof Error ? error.message : error);
    return false;
  }
}
