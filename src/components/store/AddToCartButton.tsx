"use client";

import { useState } from "react";
import ui from "@/components/ui/ui.module.scss";
import { useCart } from "./cart-store";

type Props = { shopId: string; productId: string; inStock: boolean; compact?: boolean; quantity?: number };

export function AddToCartButton({ shopId, productId, inStock, compact, quantity = 1 }: Props) {
  const { add } = useCart(shopId);
  const [added, setAdded] = useState(false);
  const className = [ui.button, ui.block, compact && ui.secondary, compact && ui.small].filter(Boolean).join(" ");

  if (!inStock) {
    return (
      <button type="button" className={`${className} ${ui.secondary}`} disabled>
        Sold out
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        add(productId, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      }}
    >
      {added ? "Added to bag ✓" : "Add to bag"}
    </button>
  );
}
