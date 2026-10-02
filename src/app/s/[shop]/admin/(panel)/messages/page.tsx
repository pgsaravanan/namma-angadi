import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import { ConfirmButton } from "@/components/admin/PromotionForms";
import { PendingButton } from "@/components/ui/PendingButton";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { indiaDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatIndianMobile } from "@/lib/india";
import { deleteMessage, setMessageReplied } from "./actions";

const TABS = [
  { key: "new", label: "New", empty: "No new messages. Messages from your Contact us page appear here." },
  { key: "replied", label: "Replied", empty: "No replied messages yet." },
] as const;

export default async function MessagesPage({ searchParams }: PageProps<"/s/[shop]/admin/messages">) {
  const { shop } = await requireShopPermission("messages:manage");
  const requested = (await searchParams).tab;
  const tab = TABS.find((candidate) => candidate.key === requested) ?? TABS[0];
  const replied = tab.key === "replied";

  const [newCount, repliedCount, messages] = await Promise.all([
    db.contactMessage.count({ where: { shopId: shop.id, repliedAt: null } }),
    db.contactMessage.count({ where: { shopId: shop.id, repliedAt: { not: null } } }),
    db.contactMessage.findMany({
      where: { shopId: shop.id, repliedAt: replied ? { not: null } : null },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const small = `${ui.button} ${ui.small}`;
  const smallSecondary = `${ui.button} ${ui.secondary} ${ui.small}`;

  return (
    <div className={styles.section}>
      <div>
        <h1 className={styles.pageTitle}>Messages</h1>
        <p className={ui.muted}>Questions customers send from your Contact us page. You also get an email for each one.</p>
      </div>

      <nav className={styles.tabs} aria-label="Message status">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/messages?tab=${item.key}`}
            className={item.key === tab.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {item.label}
            <span className={styles.tabCount}>{item.key === "new" ? newCount : repliedCount}</span>
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <p className={`${ui.card} ${ui.empty}`}>{tab.empty}</p>
      ) : (
        <div className={styles.reviewList}>
          {messages.map((message) => {
            const greeting = encodeURIComponent(`Hi ${message.name.split(" ")[0]}, this is ${shop.name}. `);
            return (
              <article key={message.id} className={`${ui.card} ${styles.reviewCard}`}>
                <div className={styles.reviewMain}>
                  <div className={styles.spotlightTop}>
                    <strong>{message.name}</strong>
                    <span className={styles.pill}>{message.topic}</span>
                    {message.orderNumber && <span className={styles.pill}>Order #{message.orderNumber}</span>}
                  </div>
                  <p className={styles.reviewComment}>{message.message}</p>
                  <span className={ui.hint}>
                    {formatIndianMobile(message.phone)}
                    {message.email && ` · ${message.email}`} · {indiaDateTime.format(message.createdAt)}
                  </span>
                  <div className={styles.listActions}>
                    <a
                      href={`https://wa.me/91${message.phone}?text=${greeting}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={small}
                    >
                      Reply on WhatsApp
                    </a>
                    <a href={`tel:+91${message.phone}`} className={smallSecondary}>
                      Call
                    </a>
                    {message.email && (
                      <a href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.topic}`)}`} className={smallSecondary}>
                        Email
                      </a>
                    )}
                  </div>
                </div>
                <div className={styles.listActions}>
                  <form action={setMessageReplied.bind(null, message.id, !replied)}>
                    <PendingButton className={smallSecondary}>{replied ? "Move back to new" : "Mark as replied"}</PendingButton>
                  </form>
                  <ConfirmButton
                    action={deleteMessage.bind(null, message.id)}
                    message="Delete this message for good?"
                    className={smallSecondary}
                  >
                    Delete
                  </ConfirmButton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
