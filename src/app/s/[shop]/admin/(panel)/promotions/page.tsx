import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import { AnnouncementForm, ConfirmButton, PromotionForm, StoryForm } from "@/components/admin/PromotionForms";
import { PendingButton, PendingLink } from "@/components/ui/PendingButton";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { indiaDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { isVideoUrl } from "@/lib/media";
import { isPromotionKind, MAX_ANNOUNCEMENTS, PROMOTION_KINDS } from "@/lib/promotions";
import {
  addAnnouncement,
  createPromotion,
  createStory,
  deletePromotion,
  deleteStory,
  moveAnnouncement,
  removeAnnouncement,
  togglePromotion,
  toggleStory,
} from "./actions";

function Media({ url, alt, className }: { url: string; alt: string; className?: string }) {
  return isVideoUrl(url) ? (
    <video src={url} className={className} muted loop autoPlay playsInline aria-label={alt} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={className} />
  );
}

export default async function PromotionsPage() {
  const { shop } = await requireShopPermission("marketing:manage");
  const [announcements, promotions, stories, products, coupons] = await Promise.all([
    db.shopAnnouncement.findMany({ where: { shopId: shop.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    db.promotion.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      include: {
        products: { select: { id: true, name: true, imageUrl: true }, orderBy: { name: "asc" } },
        coupon: { select: { code: true } },
      },
    }),
    db.customerStory.findMany({ where: { shopId: shop.id }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] }),
    db.product.findMany({
      where: { shopId: shop.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, imageUrl: true },
    }),
    db.coupon.findMany({ where: { shopId: shop.id, isActive: true }, orderBy: { code: "asc" }, select: { id: true, code: true } }),
  ]);

  const now = new Date();
  const smallSecondary = `${ui.button} ${ui.secondary} ${ui.small}`;
  const liveSpotlights = promotions.filter((promotion) => promotion.isActive && (!promotion.endsAt || promotion.endsAt > now));
  const liveStories = stories.filter((story) => story.isActive);

  const overview = [
    {
      href: "#banner",
      title: "Top banner",
      status: announcements.length ? `${announcements.length} message${announcements.length === 1 ? "" : "s"} showing` : "Not showing",
      live: announcements.length > 0,
      text: "Short messages in the coloured strip at the top of every page.",
    },
    {
      href: "#spotlights",
      title: "Spotlights",
      status: liveSpotlights.length ? `${liveSpotlights.length} live` : "None live",
      live: liveSpotlights.length > 0,
      text: "New launches and offers near the top of the home page.",
    },
    {
      href: "#stories",
      title: "Happy customers",
      status: liveStories.length ? `${liveStories.length} showing` : "None yet",
      live: liveStories.length > 0,
      text: "Photos and videos of your deliveries, gliding along the home page.",
    },
  ];

  return (
    <div className={styles.section}>
      <div>
        <h1 className={styles.pageTitle}>Promotions</h1>
        <p className={ui.muted}>Three ways to catch your customers&apos; eye. Changes show on your shop straight away.</p>
      </div>

      <nav className={styles.promoOverview} aria-label="Promotion types">
        {overview.map((item) => (
          <a key={item.href} href={item.href} className={styles.promoTile}>
            <strong>{item.title}</strong>
            <span className={item.live ? `${styles.pill} ${styles.pillLive}` : styles.pill}>{item.status}</span>
            <span className={ui.hint}>{item.text}</span>
          </a>
        ))}
      </nav>

      <section id="banner" className={`${ui.card} ${styles.promoSection}`}>
        <header className={styles.promoHeader}>
          <div>
            <h2 className={styles.cardTitle}>Top banner</h2>
            <p className={ui.muted}>
              Shown in the coloured strip at the very top of every page. With more than one, they take turns every few
              seconds, in this order.
            </p>
          </div>
        </header>

        {announcements.length === 0 ? (
          <p className={ui.empty}>No messages yet. The strip stays hidden until you add one.</p>
        ) : (
          <ol className={styles.bannerList}>
            {announcements.map((announcement, index) => (
              <li key={announcement.id} className={styles.bannerRow}>
                <div className={styles.bannerStrip}>
                  <span>{announcement.message}</span>
                  {announcement.link && <small>Opens {announcement.link}</small>}
                </div>
                <div className={styles.listActions}>
                  <form action={moveAnnouncement.bind(null, announcement.id, "up")}>
                    <PendingButton className={smallSecondary} disabled={index === 0} label="Move up">
                      ↑
                    </PendingButton>
                  </form>
                  <form action={moveAnnouncement.bind(null, announcement.id, "down")}>
                    <PendingButton className={smallSecondary} disabled={index === announcements.length - 1} label="Move down">
                      ↓
                    </PendingButton>
                  </form>
                  <ConfirmButton
                    action={removeAnnouncement.bind(null, announcement.id)}
                    message="Remove this message from the top banner?"
                    className={smallSecondary}
                  >
                    Remove
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className={styles.addPanel}>
          <h3 className={styles.addTitle}>Add a message</h3>
          <AnnouncementForm action={addAnnouncement} disabled={announcements.length >= MAX_ANNOUNCEMENTS} />
        </div>
      </section>

      <section id="spotlights" className={`${ui.card} ${styles.promoSection}`}>
        <header className={styles.promoHeader}>
          <div>
            <h2 className={styles.cardTitle}>Spotlights</h2>
            <p className={ui.muted}>
              Launching something new or running an offer? A spotlight appears near the top of the home page with its
              products sliding in. If more than one is live, they all show, newest first.
            </p>
          </div>
        </header>

        {promotions.length === 0 ? (
          <p className={ui.empty}>No spotlights yet. Create your first one below.</p>
        ) : (
          <div className={styles.spotlightList}>
            {promotions.map((promotion) => {
              const ended = promotion.endsAt !== null && promotion.endsAt <= now;
              const live = promotion.isActive && !ended;
              const status = ended ? "Ended" : live ? "Live on home page" : "Turned off";
              return (
                <article
                  key={promotion.id}
                  className={live ? styles.spotlightCard : `${styles.spotlightCard} ${styles.spotlightOff}`}
                >
                  <div>
                    <div className={styles.spotlightTop}>
                      <span className={live ? `${styles.pill} ${styles.pillLive}` : styles.pill}>{status}</span>
                      <span className={styles.pill}>
                        {isPromotionKind(promotion.kind) ? PROMOTION_KINDS[promotion.kind] : promotion.kind}
                      </span>
                      {promotion.coupon && <span className={styles.pill}>Code {promotion.coupon.code}</span>}
                    </div>
                    <h3 className={styles.spotlightTitle}>{promotion.title}</h3>
                    {promotion.subtitle && <p className={ui.muted}>{promotion.subtitle}</p>}
                    <div className={ui.hint}>
                      {promotion.endsAt
                        ? `${ended ? "Ended" : "Ends"} ${indiaDateTime.format(promotion.endsAt)}`
                        : "No end date"}
                      {` · ${promotion.products.length} product${promotion.products.length === 1 ? "" : "s"}`}
                    </div>
                    <div className={styles.spotlightThumbs}>
                      {promotion.mediaUrl && (
                        <Media url={promotion.mediaUrl} alt="Spotlight picture" className={styles.spotlightMedia} />
                      )}
                      {promotion.products.map((product) =>
                        product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={product.id} src={product.imageUrl} alt={product.name} title={product.name} />
                        ) : (
                          <span key={product.id} title={product.name} />
                        ),
                      )}
                    </div>
                  </div>
                  <div className={styles.spotlightActions}>
                    <PendingLink href={`/admin/promotions/${promotion.id}`} className={`${ui.button} ${ui.small}`}>
                      Edit
                    </PendingLink>
                    {live && (
                      <Link href="/" target="_blank" className={smallSecondary}>
                        View on shop ↗
                      </Link>
                    )}
                    {!ended && (
                      <form action={togglePromotion.bind(null, promotion.id)}>
                        <PendingButton className={`${smallSecondary} ${ui.block}`}>
                          {promotion.isActive ? "Turn off" : "Turn on"}
                        </PendingButton>
                      </form>
                    )}
                    <ConfirmButton
                      action={deletePromotion.bind(null, promotion.id)}
                      message={`Delete "${promotion.title}"? This cannot be undone.`}
                      className={`${smallSecondary} ${ui.block}`}
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className={styles.addPanel}>
          <h3 className={styles.addTitle}>Add a new spotlight</h3>
          <PromotionForm action={createPromotion} products={products} coupons={coupons} />
        </div>
      </section>

      <section id="stories" className={`${ui.card} ${styles.promoSection}`}>
        <header className={styles.promoHeader}>
          <div>
            <h2 className={styles.cardTitle}>Happy customers</h2>
            <p className={ui.muted}>
              Share a photo, GIF or short video of a delivery with a few words. They glide along a &ldquo;From our happy
              customers&rdquo; section on your home page, newest first.
            </p>
          </div>
        </header>

        {stories.length === 0 ? (
          <p className={ui.empty}>Nothing here yet. Add your first delivery below.</p>
        ) : (
          <div className={styles.storyGrid}>
            {stories.map((story) => (
              <article key={story.id} className={story.isActive ? styles.storyCard : `${styles.storyCard} ${styles.storyOff}`}>
                {story.mediaUrl ? (
                  <Media url={story.mediaUrl} alt={story.caption} className={styles.storyMedia} />
                ) : (
                  <div className={`${styles.storyMedia} ${styles.storyPlaceholder}`}>
                    {(shop.iconUrl ?? shop.logoUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={(shop.iconUrl ?? shop.logoUrl)!} alt="" />
                    ) : (
                      <span>{shop.name.charAt(0)}</span>
                    )}
                  </div>
                )}
                <div className={styles.storyBody}>
                  <span className={story.isActive ? `${styles.pill} ${styles.pillLive}` : styles.pill}>
                    {story.isActive ? "Showing" : "Hidden"}
                  </span>
                  <p>{story.caption}</p>
                  {(story.customerName || story.place) && (
                    <span className={ui.hint}>{[story.customerName, story.place].filter(Boolean).join(" · ")}</span>
                  )}
                  <div className={styles.listActions}>
                    <PendingLink href={`/admin/promotions/stories/${story.id}`} className={`${ui.button} ${ui.small}`}>
                      Edit
                    </PendingLink>
                    <form action={toggleStory.bind(null, story.id)}>
                      <PendingButton className={smallSecondary}>{story.isActive ? "Hide" : "Show"}</PendingButton>
                    </form>
                    <ConfirmButton
                      action={deleteStory.bind(null, story.id)}
                      message="Delete this story? This cannot be undone."
                      className={smallSecondary}
                    >
                      Delete
                    </ConfirmButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className={styles.addPanel}>
          <h3 className={styles.addTitle}>Add a happy customer</h3>
          <StoryForm action={createStory} />
        </div>
      </section>
    </div>
  );
}
