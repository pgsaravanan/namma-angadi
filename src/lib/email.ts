import "server-only";
import { db } from "./db";

const SECRET_LINK = /\/(reset|welcome)\/[A-Za-z0-9_-]+/g;

function forLog(text: string) {
  return text.replace(SECRET_LINK, "/$1/[link hidden]");
}

type EmailInput = { shopId: string | null; to: string; subject: string; text: string; replyTo?: string | null };

export async function sendEmail({ shopId, to, subject, text, replyTo }: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(`[email not configured] to=${to} subject="${subject}"`);
    await db.outboundEmail.create({ data: { shopId, to, subject, text: forLog(text), status: "logged" } });
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, ...(replyTo && { reply_to: replyTo }) }),
      cache: "no-store",
    });
    const error = response.ok ? null : `${response.status} ${(await response.text()).slice(0, 200)}`;
    await db.outboundEmail.create({
      data: { shopId, to, subject, text: forLog(text), status: error ? "failed" : "sent", error },
    });
  } catch (error) {
    await db.outboundEmail.create({
      data: {
        shopId,
        to,
        subject,
        text: forLog(text),
        status: "failed",
        error: error instanceof Error ? error.message : "unknown",
      },
    });
  }
}
