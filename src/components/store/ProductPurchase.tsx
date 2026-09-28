"use client";

import Link from "next/link";
import { useState } from "react";
import ui from "@/components/ui/ui.module.scss";
import { AddToCartButton } from "./AddToCartButton";
import { MAX_QUANTITY } from "./cart-store";
import styles from "./ProductPurchase.module.scss";

export function ProductPurchase({ shopId, productId, stock }: { shopId: string; productId: string; stock: number }) {
  const [quantity, setQuantity] = useState(1);
  const max = Math.min(stock, MAX_QUANTITY);

  return (
    <div className={styles.purchase}>
      {stock > 0 && (
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
        <AddToCartButton shopId={shopId} productId={productId} inStock={stock > 0} quantity={quantity} />
      </div>
      <Link href="/cart" className={`${ui.button} ${ui.secondary} ${ui.block}`}>
        View bag and pay
      </Link>
    </div>
  );
}
