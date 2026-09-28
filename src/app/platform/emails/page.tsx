import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import ui from "@/components/ui/ui.module.scss";
import { requirePlatformAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { indiaDateTime } from "@/lib/dates";

export const metadata = { title: "Email log · Namma Angadi", robots: { index: false } };


const STATUS_TEXT: Record<string, string> = {
  sent: "Sent",
  failed: "Failed",
  logged: "Not sent (email not set up)",
};

export default async function EmailLogPage() {
  await requirePlatformAdmin();
  const [emails, shops] = await Promise.all([
    db.outboundEmail.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.shop.findMany({ select: { id: true, name: true } }),
  ]);
  const shopName = new Map(shops.map((shop) => [shop.id, shop.name]));

  return (
    <main className={`${styles.platformContent} ${styles.section}`}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Email log</h1>
          <p className={ui.muted}>
            Every email the platform sends. Until RESEND_API_KEY and EMAIL_FROM are set, emails are only recorded here.
          </p>
        </div>
        <Link href="/platform" className={`${ui.button} ${ui.secondary}`}>
          Back to shops
        </Link>
      </div>
      {emails.length === 0 && <p className={`${ui.card} ${ui.empty}`}>No emails yet.</p>}
      {emails.map((email) => (
        <details key={email.id} className={ui.card}>
          <summary className={styles.emailSummary}>
            <strong>{email.subject}</strong>
            <span className={ui.muted}>
              to {email.to} · {email.shopId ? shopName.get(email.shopId) : "Platform"} · {indiaDateTime.format(email.createdAt)} ·{" "}
              {STATUS_TEXT[email.status] ?? email.status}
            </span>
          </summary>
          <pre className={styles.emailBody}>{email.text}</pre>
          {email.error && <p className={`${ui.message} ${ui.error}`}>{email.error}</p>}
        </details>
      ))}
    </main>
  );
}
