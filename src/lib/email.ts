import "server-only";
import { db } from "./db";

const SECRET_LINK = /\/(reset|welcome)\/[A-Za-z0-9_-]+/g;
const DEFAULT_SENDER_NAME = "Namma Angadi";

function forLog(text: string) {
  return text.replace(SECRET_LINK, "/$1/[link hidden]");
}

type EmailInput = {
  shopId: string | null;
  to: string;
  subject: string;
  text: string;
  replyTo?: string | null;
  senderName?: string;
};

type Delivery = { ok: true } | { ok: false; error: string };

async function sendWithBrevo(apiKey: string, from: string, input: EmailInput): Promise<Delivery> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: input.senderName ?? DEFAULT_SENDER_NAME },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.text,
      ...(input.replyTo && { replyTo: { email: input.replyTo } }),
    }),
    cache: "no-store",
  });
  return response.ok ? { ok: true } : { ok: false, error: `${response.status} ${(await response.text()).slice(0, 200)}` };
}

async function sendWithResend(apiKey: string, from: string, input: EmailInput): Promise<Delivery> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${input.senderName ?? DEFAULT_SENDER_NAME} <${from}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.replyTo && { reply_to: input.replyTo }),
    }),
    cache: "no-store",
  });
  return response.ok ? { ok: true } : { ok: false, error: `${response.status} ${(await response.text()).slice(0, 200)}` };
}

async function shopSender(shopId: string | null) {
  if (!shopId) return null;
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { senderEmail: true } });
  return shop?.senderEmail ?? null;
}

async function deliver(from: string, input: EmailInput): Promise<Delivery> {
  const brevoKey = process.env.BREVO_API_KEY;
  try {
    return brevoKey ? await sendWithBrevo(brevoKey, from, input) : await sendWithResend(process.env.RESEND_API_KEY!, from, input);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown" };
  }
}

export async function sendEmail(input: EmailInput) {
  const defaultFrom = process.env.EMAIL_FROM;
  const record = { shopId: input.shopId, to: input.to, subject: input.subject, text: forLog(input.text) };

  if (!defaultFrom || (!process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY)) {
    console.info(`[email not configured] to=${input.to} subject="${input.subject}"`);
    await db.outboundEmail.create({ data: { ...record, status: "logged" } });
    return;
  }

  const ownSender = await shopSender(input.shopId);
  let delivery = await deliver(ownSender ?? defaultFrom, input);
  let note: string | null = null;

  if (!delivery.ok && ownSender && ownSender !== defaultFrom) {
    note = `Shop sender ${ownSender} was refused (${delivery.error}); sent from ${defaultFrom} instead`;
    delivery = await deliver(defaultFrom, input);
  }

  await db.outboundEmail.create({
    data: {
      ...record,
      status: delivery.ok ? "sent" : "failed",
      error: delivery.ok ? note : [note, delivery.error].filter(Boolean).join(" · "),
    },
  });
}
