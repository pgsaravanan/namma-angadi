import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/store/ProductCard";
import { ProductPurchase } from "@/components/store/ProductPurchase";
import { Stars } from "@/components/store/Stars";
import { VegMark } from "@/components/store/VegMark";
import { db } from "@/lib/db";
import { indiaDate } from "@/lib/dates";
import { formatIndianMobile } from "@/lib/india";
import { ratingSummaries, withRatings } from "@/lib/reviews";
import { variantStock } from "@/lib/stock";
import { requireShop } from "@/lib/tenant";
import styles from "../../store.module.scss";

const RELATED_COUNT = 4;

const findProduct = cache(async (productId: string) => {
  const shop = await requireShop();
  const product = await db.product.findFirst({
    where: { id: productId, shopId: shop.id, isActive: true },
    include: { category: true, variants: { orderBy: { position: "asc" } } },
  });
  return { shop, product };
});

export async function generateMetadata({ params }: PageProps<"/s/[shop]/p/[productId]">) {
  const { product } = await findProduct((await params).productId);
  return product ? { title: product.name, description: product.description || undefined } : {};
}

export default async function ProductPage({ params }: PageProps<"/s/[shop]/p/[productId]">) {
  const { productId } = await params;
  const { shop, product } = await findProduct(productId);
  if (!product) notFound();

  const [relatedProducts, reviews, summaries] = await Promise.all([
    db.product.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
      id: { not: product.id },
      ...(product.categoryId && { categoryId: product.categoryId }),
    },
    orderBy: { createdAt: "desc" },
    take: RELATED_COUNT,
      include: { variants: { select: { pricePaise: true, stock: true, packAmount: true } } },
    }),
    db.productReview.findMany({
      where: { shopId: shop.id, productId: product.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    ratingSummaries(shop.id, [product.id]),
  ]);
  const related = await withRatings(shop.id, relatedProducts);
  const summary = summaries.get(product.id);

  return (
    <div className={`${styles.container} ${styles.stack}`}>
      <div className={styles.productLayout}>
        <div className={styles.productMedia}>
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} />
          )}
        </div>
        <div className={styles.productInfo}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            {product.category ? (
              <Link href={`/products?category=${product.category.id}`}>{product.category.name}</Link>
            ) : (
              <Link href="/products">Shop</Link>
            )}
          </nav>
          <h1 className={styles.productTitle}>
            <VegMark type={product.foodType} /> {product.name}
          </h1>
          {summary && (
            <a href="#reviews" className={styles.ratingLink}>
              <Stars value={summary.average} count={summary.count} />
            </a>
          )}
          {product.description && <p className={styles.productDescription}>{product.description}</p>}
          <ProductPurchase
            shopId={shop.id}
            productId={product.id}
            pricePaise={product.pricePaise}
            stock={product.stock}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              label: variant.label,
              pricePaise: variant.pricePaise,
              stock: variantStock(product, variant),
            }))}
          />
          <p className={styles.note}>
            Pay securely by UPI at checkout.
            {shop.supportPhone && ` Questions? Call ${shop.contactName ?? shop.name} on ${formatIndianMobile(shop.supportPhone)}.`}
          </p>
        </div>
      </div>

      {summary && (
        <section id="reviews" className={styles.reviewsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>Customer reviews</h2>
            <Stars value={summary.average} count={summary.count} />
          </div>
          <div className={styles.reviewGrid}>
            {reviews.map((review) => (
              <article key={review.id} className={styles.reviewCard}>
                <Stars value={review.rating} small />
                <p>{review.comment}</p>
                <span className={styles.reviewMeta}>
                  <strong>{review.customerName}</strong> · Verified purchase · {indiaDate.format(review.createdAt)}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.title}>You may also like</h2>
          </div>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
