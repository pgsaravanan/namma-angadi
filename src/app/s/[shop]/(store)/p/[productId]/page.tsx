import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/store/ProductCard";
import { ProductPurchase } from "@/components/store/ProductPurchase";
import { VegMark } from "@/components/store/VegMark";
import { db } from "@/lib/db";
import { formatIndianMobile } from "@/lib/india";
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

  const related = await db.product.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
      id: { not: product.id },
      ...(product.categoryId && { categoryId: product.categoryId }),
    },
    orderBy: { createdAt: "desc" },
    take: RELATED_COUNT,
    include: { variants: { select: { pricePaise: true, stock: true, packAmount: true } } },
  });

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
