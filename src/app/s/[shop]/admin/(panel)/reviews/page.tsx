import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import { ConfirmButton } from "@/components/admin/PromotionForms";
import { Stars } from "@/components/store/Stars";
import { FormMessage } from "@/components/ui/FormMessage";
import { PendingButton } from "@/components/ui/PendingButton";
import ui from "@/components/ui/ui.module.scss";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { requireShopPermission } from "@/lib/auth";
import { indiaDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { deleteFeedback, deleteReview, hideFeedback, publishFeedback, setReviewStatus } from "./actions";

const FEEDBACK_TAB = "FEEDBACK";

const TABS: { status: ReviewStatus; label: string; empty: string }[] = [
  { status: "PENDING", label: "Waiting for approval", empty: "No reviews waiting. New ones from delivered orders appear here first." },
  { status: "APPROVED", label: "Published", empty: "No published reviews yet." },
  { status: "HIDDEN", label: "Hidden", empty: "No hidden reviews." },
];

export default async function ReviewsPage({ searchParams }: PageProps<"/s/[shop]/admin/reviews">) {
  const { shop } = await requireShopPermission("reviews:manage");
  const query = await searchParams;
  const showFeedback = query.tab === FEEDBACK_TAB;
  const tab = TABS.find((candidate) => candidate.status === query.tab) ?? TABS[0];
  const error = typeof query.error === "string" ? query.error : undefined;

  const [counts, feedbackCount, reviews, feedback] = await Promise.all([
    db.productReview.groupBy({ by: ["status"], where: { shopId: shop.id }, _count: true }),
    db.orderFeedback.count({ where: { shopId: shop.id } }),
    showFeedback
      ? []
      : db.productReview.findMany({
          where: { shopId: shop.id, status: tab.status },
          orderBy: { createdAt: "desc" },
          include: { product: { select: { name: true, imageUrl: true } }, order: { select: { id: true, number: true } } },
        }),
    showFeedback
      ? db.orderFeedback.findMany({
          where: { shopId: shop.id },
          orderBy: { createdAt: "desc" },
          include: { order: { select: { id: true, number: true } } },
        })
      : [],
  ]);
  const countFor = (status: ReviewStatus) => counts.find((row) => row.status === status)?._count ?? 0;
  const small = `${ui.button} ${ui.small}`;
  const smallSecondary = `${ui.button} ${ui.secondary} ${ui.small}`;

  return (
    <div className={styles.section}>
      <div>
        <h1 className={styles.pageTitle}>Reviews</h1>
        <p className={ui.muted}>
          Only customers with a delivered order can review an item, and nothing appears on your shop until you publish it.
        </p>
      </div>

      <nav className={styles.tabs} aria-label="Review status">
        {TABS.map((item) => (
          <Link
            key={item.status}
            href={`/admin/reviews?tab=${item.status}`}
            className={!showFeedback && item.status === tab.status ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {item.label}
            <span className={styles.tabCount}>{countFor(item.status)}</span>
          </Link>
        ))}
        <Link
          href={`/admin/reviews?tab=${FEEDBACK_TAB}`}
          className={showFeedback ? `${styles.tab} ${styles.tabActive}` : styles.tab}
        >
          Order feedback
          <span className={styles.tabCount}>{feedbackCount}</span>
        </Link>
      </nav>

      {error && <FormMessage state={{ error }} />}

      {showFeedback ? (
        feedback.length === 0 ? (
          <p className={`${ui.card} ${ui.empty}`}>No feedback yet. Customers can rate their ordering experience right after they pay.</p>
        ) : (
          <div className={styles.reviewList}>
            {feedback.map((item) => (
              <article key={item.id} className={`${ui.card} ${styles.reviewCard}`}>
                <div className={styles.reviewMain}>
                  <div className={styles.spotlightTop}>
                    <Stars value={item.rating} />
                    <span className={item.status === "APPROVED" ? `${styles.pill} ${styles.pillLive}` : styles.pill}>
                      {item.status === "APPROVED"
                        ? "Showing in Happy customers"
                        : item.canPublish
                          ? "Customer is happy for you to show it"
                          : "Private to you"}
                    </span>
                  </div>
                  {item.comment ? <p className={styles.reviewComment}>{item.comment}</p> : <p className={ui.muted}>No comment, just a rating.</p>}
                  <span className={ui.hint}>
                    {item.customerName} · {indiaDateTime.format(item.createdAt)} ·{" "}
                    <Link href={`/admin/orders/${item.order.id}`}>Order #{item.order.number}</Link>
                  </span>
                </div>
                <div className={styles.listActions}>
                  {item.canPublish && item.comment.length >= 3 && item.status !== "APPROVED" && (
                    <form action={publishFeedback.bind(null, item.id)}>
                      <PendingButton className={small}>Show in Happy customers</PendingButton>
                    </form>
                  )}
                  {item.status === "APPROVED" && (
                    <form action={hideFeedback.bind(null, item.id)}>
                      <PendingButton className={smallSecondary}>Remove from shop</PendingButton>
                    </form>
                  )}
                  <ConfirmButton
                    action={deleteFeedback.bind(null, item.id)}
                    message="Delete this feedback? If it's showing in Happy customers, it is removed from there too."
                    className={smallSecondary}
                  >
                    Delete
                  </ConfirmButton>
                </div>
              </article>
            ))}
          </div>
        )
      ) : reviews.length === 0 ? (
        <p className={`${ui.card} ${ui.empty}`}>{tab.empty}</p>
      ) : (
        <div className={styles.reviewList}>
          {reviews.map((review) => (
            <article key={review.id} className={`${ui.card} ${styles.reviewCard}`}>
              <div className={styles.reviewMain}>
                <div className={styles.spotlightTop}>
                  <Stars value={review.rating} />
                  <strong>{review.product.name}</strong>
                </div>
                <p className={styles.reviewComment}>{review.comment}</p>
                <span className={ui.hint}>
                  {review.customerName} · {indiaDateTime.format(review.createdAt)} ·{" "}
                  <Link href={`/admin/orders/${review.order.id}`}>Order #{review.order.number}</Link>
                </span>
              </div>
              <div className={styles.listActions}>
                {review.status !== "APPROVED" && (
                  <form action={setReviewStatus.bind(null, review.id, "APPROVED")}>
                    <PendingButton className={small}>Publish</PendingButton>
                  </form>
                )}
                {review.status !== "HIDDEN" && (
                  <form action={setReviewStatus.bind(null, review.id, "HIDDEN")}>
                    <PendingButton className={smallSecondary}>Hide</PendingButton>
                  </form>
                )}
                <ConfirmButton
                  action={deleteReview.bind(null, review.id)}
                  message="Delete this review? The customer will be able to write a new one. To keep it off your shop for good, use Hide instead."
                  className={smallSecondary}
                >
                  Delete
                </ConfirmButton>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
