"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminShell.module.scss";

export type NavItem = { href: string; label: string };

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={active ? `${styles.navLink} ${styles.active}` : styles.navLink}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
