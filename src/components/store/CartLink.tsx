"use client";

import Link from "next/link";
import { useCart } from "./cart-store";
import { BagIcon } from "./icons";
import styles from "./StoreHeader.module.scss";

export function CartLink({ shopId }: { shopId: string }) {
  const { count } = useCart(shopId);
  return (
    <Link href="/cart" className={styles.iconLink} aria-label={`Bag, ${count} item${count === 1 ? "" : "s"}`}>
      <BagIcon className={styles.icon} />
      {count > 0 && <span className={styles.cartCount}>{count}</span>}
    </Link>
  );
}
