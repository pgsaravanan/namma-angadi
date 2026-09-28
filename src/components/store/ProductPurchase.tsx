"use client";

import Link from "next/link";
import { useState } from "react";
import ui from "@/components/ui/ui.module.scss";
import { formatPaise } from "@/lib/money";
import { AddToCartButton } from "./AddToCartButton";
import { MAX_QUANTITY } from "./cart-store";
import styles from "./ProductPurchase.module.scss";

type Variant = { id: string; label: string; pricePaise: number; stock: number };

type Props = { shopId: string; productId: string; pricePaise: number; stock: number; variants: Variant[] };

export function ProductPurchase({ shopId, productId, pricePaise, stock, variants }: Props) {
  const firstAvailable = variants.find((variant) => variant.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState<string | null>(firstAvailable?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  const selected = variants.find((variant) => variant.id === variantId);
  const available = selected ? selected.stock : stock;
  const max = Math.min(available, MAX_QUANTITY);

  return (
    <div className={styles.wrap}>
      <div className={styles.price}>{formatPaise(selected?.pricePaise ?? pricePaise)}</div>

      {variants.length > 0 && (
        <fieldset className={styles.sizes}>
          <legend>Pack size</legend>
          <div className={styles.sizeOptions}>
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className={variant.id === variantId ? `${styles.size} ${styles.sizeActive}` : styles.size}
                aria-pressed={variant.id === variantId}
                disabled={variant.stock === 0}
                onClick={() => {
                  setVariantId(variant.id);
                  setQuantity(1);
                }}
              >
                <span>{variant.label}</span>
                <small>{variant.stock === 0 ? "Sold out" : formatPaise(variant.pricePaise)}</small>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className={styles.purchase}>
        {available > 0 && (
          <div className={styles.stepper} aria-label="Quantity">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="One less">
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(max, value + 1))}
              disabled={quantity >= max}
              aria-label="One more"
            >
              +
            </button>
          </div>
        )}
        <div className={styles.add}>
          <AddToCartButton
            shopId={shopId}
            productId={productId}
            variantId={selected?.id ?? null}
            inStock={available > 0}
            quantity={quantity}
          />
        </div>
        <Link href="/cart" className={`${ui.button} ${ui.secondary} ${ui.block}`}>
          View bag and pay
        </Link>
      </div>
    </div>
  );
}
