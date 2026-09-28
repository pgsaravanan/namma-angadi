import Link from "next/link";
import { ProductGrid } from "@/components/store/ProductCard";
import ui from "@/components/ui/ui.module.scss";
import { listCategories } from "@/lib/categories";
import { db } from "@/lib/db";
import { releaseExpiredOrders } from "@/lib/orders";
import { requireShop } from "@/lib/tenant";
import styles from "./store.module.scss";

const NEW_IN_COUNT = 8;

export default async function StoreHomePage() {
  const shop = await requireShop();
  await releaseExpiredOrders(shop.id);

  const [categories, newIn, covers] = await Promise.all([
    listCategories(shop.id),
    db.product.findMany({
      where: { shopId: shop.id, isActive: true },
      orderBy: { createdAt: "desc" },
      take: NEW_IN_COUNT,
    }),
    db.product.findMany({
      where: { shopId: shop.id, isActive: true, imageUrl: { not: null }, categoryId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { categoryId: true, imageUrl: true },
    }),
  ]);

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
      </section>

      <div className={`${styles.container} ${styles.stack}`}>
        {tiles.length > 0 && (
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.title}>Shop by category</h2>
            </div>
            <div className={styles.tiles}>
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
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>New in</h2>
            <Link href="/products" className={styles.underlineLink}>
              View all
            </Link>
          </div>
          {newIn.length ? <ProductGrid products={newIn} /> : <p className={ui.empty}>New products are coming soon.</p>}
        </section>

        {(shop.about || shop.address) && (
          <section className={styles.about}>
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
