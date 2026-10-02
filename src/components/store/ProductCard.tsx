import Link from "next/link";
import type { Product, ProductVariant } from "@/generated/prisma/client";
import ui from "@/components/ui/ui.module.scss";
import { formatPaise } from "@/lib/money";
import { productStock } from "@/lib/stock";
import { AddToCartButton } from "./AddToCartButton";
import { Stars } from "./Stars";
import styles from "./ProductCard.module.scss";
import { VegMark } from "./VegMark";

export type CardProduct = Pick<
  Product,
  "id" | "shopId" | "name" | "imageUrl" | "pricePaise" | "stock" | "stockUnit" | "foodType"
> & {
  variants: Pick<ProductVariant, "pricePaise" | "stock" | "packAmount">[];
  rating?: { average: number; count: number } | null;
};

export function ProductCard({ product }: { product: CardProduct }) {
  const hasVariants = product.variants.length > 0;
  const stock = productStock(product);
  const fromPrice = hasVariants ? Math.min(...product.variants.map((variant) => variant.pricePaise)) : product.pricePaise;
  const inStock = stock > 0;

  return (
    <article className={styles.card}>
      <Link href={`/p/${product.id}`} className={styles.media}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className={styles.image} loading="lazy" />
        ) : (
          <span className={styles.placeholder} aria-hidden>
            {product.name.charAt(0)}
          </span>
        )}
        {!inStock && <span className={styles.badge}>Sold out</span>}
        {inStock && !hasVariants && stock <= 5 && <span className={styles.badge}>Only {stock} left</span>}
      </Link>
      <div className={styles.body}>
        <Link href={`/p/${product.id}`} className={styles.name}>
          <VegMark type={product.foodType} /> {product.name}
        </Link>
        {product.rating && <Stars value={product.rating.average} count={product.rating.count} small />}
        <div className={styles.price}>
          {hasVariants && <span className={styles.from}>From </span>}
          {formatPaise(fromPrice)}
        </div>
      </div>
      <div className={styles.quickAdd}>
        {hasVariants && inStock ? (
          <Link href={`/p/${product.id}`} className={`${ui.button} ${ui.secondary} ${ui.small} ${ui.block}`}>
            Choose size
          </Link>
        ) : (
          <AddToCartButton shopId={product.shopId} productId={product.id} inStock={inStock} compact />
        )}
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: CardProduct[] }) {
  return (
    <div className={styles.grid} data-reveal-group>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
