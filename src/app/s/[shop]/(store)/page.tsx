import Link from "next/link";
import { CustomerStories } from "@/components/store/CustomerStories";
import { LatestDeliveries } from "@/components/store/LatestDeliveries";
import { ProductGrid } from "@/components/store/ProductCard";
import { Spotlight } from "@/components/store/Spotlight";
import ui from "@/components/ui/ui.module.scss";
import { listCategories } from "@/lib/categories";
import { db } from "@/lib/db";
import { releaseExpiredOrders } from "@/lib/orders";
import { ratingSummaries } from "@/lib/reviews";
import { requireShop } from "@/lib/tenant";
import styles from "./store.module.scss";

const NEW_IN_COUNT = 8;

export default async function StoreHomePage() {
  const shop = await requireShop();
  await releaseExpiredOrders(shop.id);

  const now = new Date();
  const cardVariants = { select: { pricePaise: true, stock: true, packAmount: true } };
  const [categories, newIn, covers, promotions, stories] = await Promise.all([
    listCategories(shop.id),
    db.product.findMany({
      where: { shopId: shop.id, isActive: true },
      orderBy: { createdAt: "desc" },
      take: NEW_IN_COUNT,
      include: { variants: cardVariants },
    }),
    db.product.findMany({
      where: { shopId: shop.id, isActive: true, imageUrl: { not: null }, categoryId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { categoryId: true, imageUrl: true },
    }),
    db.promotion.findMany({
      where: { shopId: shop.id, isActive: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      orderBy: { createdAt: "desc" },
      include: {
        coupon: { select: { code: true, isActive: true } },
        products: { where: { isActive: true }, orderBy: { name: "asc" }, include: { variants: cardVariants } },
      },
    }),
    db.customerStory.findMany({
      where: { shopId: shop.id, isActive: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      select: { id: true, caption: true, customerName: true, place: true, mediaUrl: true },
    }),
  ]);
  const ratings = await ratingSummaries([...newIn, ...promotions.flatMap((promotion) => promotion.products)].map((p) => p.id));
  const rated = <T extends { id: string }>(product: T) => ({ ...product, rating: ratings.get(product.id) ?? null });
  const spotlights = promotions
    .filter((promotion) => promotion.products.length > 0)
    .map((promotion) => ({
      ...promotion,
      products: promotion.products.map(rated),
      couponCode: promotion.coupon?.isActive ? promotion.coupon.code : null,
    }));
  const [firstSpotlight, ...moreSpotlights] = spotlights;
  const storiesBesideSpotlight = Boolean(firstSpotlight) && stories.length > 0;
  const storyPlaceholder = { logoUrl: shop.iconUrl ?? shop.logoUrl, name: shop.name };

  const tiles = categories.map((category) => ({
    ...category,
    cover: category.imageUrl ?? covers.find((product) => product.categoryId === category.id)?.imageUrl ?? null,
  }));
  const heroLinks = categories.slice(0, 3);

  return (
    <>
      <section className={styles.hero}>
        {shop.heroImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shop.heroImageUrl} alt="" className={styles.heroImage} />
            <div className={styles.heroShade} />
          </>
        )}
        <div className={styles.heroContent}>
          <div>
            <p className={styles.heroEyebrow}>{shop.name}</p>
            <h1 className={styles.heroTitle}>{shop.heroTitle ?? `Welcome to ${shop.name}`}</h1>
            {shop.heroSubtitle && <p className={styles.heroText}>{shop.heroSubtitle}</p>}
            <div className={styles.heroLinks}>
              {heroLinks.length ? (
                heroLinks.map((category) => (
                  <Link key={category.id} href={`/products?category=${category.id}`} className={styles.underlineLink}>
                    Shop {category.name}
                  </Link>
                ))
              ) : (
                <Link href="/products" className={styles.underlineLink}>
                  Shop now
                </Link>
              )}
            </div>
          </div>
          {shop.heroArtUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.heroArtUrl} alt="" className={styles.heroArt} />
          )}
        </div>
      </section>

      <div className={`${styles.container} ${styles.stack}`}>
        {firstSpotlight &&
          (storiesBesideSpotlight ? (
            <div className={styles.featureRow}>
              <Spotlight promotion={firstSpotlight} />
              <LatestDeliveries stories={stories} placeholder={storyPlaceholder} />
            </div>
          ) : (
            <Spotlight promotion={firstSpotlight} />
          ))}
        {!firstSpotlight && stories.length > 0 && <CustomerStories stories={stories} placeholder={storyPlaceholder} />}
        {moreSpotlights.map((promotion) => (
          <Spotlight key={promotion.id} promotion={promotion} />
        ))}

        {tiles.length > 0 && (
          <section>
            <div className={styles.sectionHeader} data-reveal>
              <h2 className={styles.title}>Shop by category</h2>
            </div>
            <div className={styles.tiles} data-reveal-group>
              {tiles.map((tile) => (
                <Link key={tile.id} href={`/products?category=${tile.id}`} className={styles.tile}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {tile.cover && <img src={tile.cover} alt="" loading="lazy" />}
                  <span className={styles.tileText}>
                    <strong>{tile.name}</strong>
                    <span className={styles.underlineLink}>Shop now</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className={styles.sectionHeader} data-reveal>
            <h2 className={styles.title}>New in</h2>
            <Link href="/products" className={styles.underlineLink}>
              View all
            </Link>
          </div>
          {newIn.length ? <ProductGrid products={newIn.map(rated)} /> : <p className={ui.empty}>New products are coming soon.</p>}
        </section>

        {(shop.about || shop.address) && (
          <section className={styles.about} data-reveal>
            <h2 className={styles.title}>About {shop.name}</h2>
            <div>
              {shop.about && <p>{shop.about}</p>}
              {shop.address && <p>{shop.address}</p>}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
