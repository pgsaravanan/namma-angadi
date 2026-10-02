import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import { ConfirmButton } from "@/components/admin/PromotionForms";
import { Stars } from "@/components/store/Stars";
import { PendingButton } from "@/components/ui/PendingButton";
import ui from "@/components/ui/ui.module.scss";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { requireShopPermission } from "@/lib/auth";
import { indiaDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { deleteReview, setReviewStatus } from "./actions";

const TABS: { status: ReviewStatus; label: string; empty: string }[] = [
  { status: "PENDING", label: "Waiting for approval", empty: "No reviews waiting. New ones from delivered orders appear here first." },
  { status: "APPROVED", label: "Published", empty: "No published reviews yet." },
  { status: "HIDDEN", label: "Hidden", empty: "No hidden reviews." },
];

export default async function ReviewsPage({ searchParams }: PageProps<"/s/[shop]/admin/reviews">) {
  const { shop } = await requireShopPermission("reviews:manage");
  const requested = (await searchParams).tab;
  const tab = TABS.find((candidate) => candidate.status === requested) ?? TABS[0];

  const [counts, reviews] = await Promise.all([
    db.productReview.groupBy({ by: ["status"], where: { shopId: shop.id }, _count: true }),
    db.productReview.findMany({
      where: { shopId: shop.id, status: tab.status },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, imageUrl: true } }, order: { select: { id: true, number: true } } },
    }),
  ]);
  const countFor = (status: ReviewStatus) => counts.find((row) => row.status === status)?._count ?? 0;
  const small = `${ui.button} ${ui.small}`;
  const smallSecondary = `${ui.button} ${ui.secondary} ${ui.small}`;

  return (
    <div className={styles.section}>
      <div>
        <h1 className={styles.pageTitle}>Reviews</h1>
        <p className={ui.muted}>
          Only customers with a delivered order can write a review, and nothing appears on your shop until you publish it.
        </p>
      </div>

      <nav className={styles.tabs} aria-label="Review status">
        {TABS.map((item) => (
          <Link
            key={item.status}
            href={`/admin/reviews?tab=${item.status}`}
            className={item.status === tab.status ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {item.label}
            <span className={styles.tabCount}>{countFor(item.status)}</span>
          </Link>
        ))}
      </nav>

      {reviews.length === 0 ? (
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
                  message="Delete this review for good? The customer won't be able to write another one for this order."
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
