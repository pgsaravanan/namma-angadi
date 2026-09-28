import Link from "next/link";
import type { Product } from "@/generated/prisma/client";
import { formatPaise } from "@/lib/money";
import { AddToCartButton } from "./AddToCartButton";
import styles from "./ProductCard.module.scss";

type CardProduct = Pick<Product, "id" | "shopId" | "name" | "imageUrl" | "pricePaise" | "stock">;

export function ProductCard({ product }: { product: CardProduct }) {
  const inStock = product.stock > 0;
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
        {inStock && product.stock <= 5 && <span className={styles.badge}>Only {product.stock} left</span>}
      </Link>
      <div className={styles.body}>
        <Link href={`/p/${product.id}`} className={styles.name}>
          {product.name}
        </Link>
        <div className={styles.price}>{formatPaise(product.pricePaise)}</div>
      </div>
      <div className={styles.quickAdd}>
        <AddToCartButton shopId={product.shopId} productId={product.id} inStock={inStock} compact />
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: CardProduct[] }) {
  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
