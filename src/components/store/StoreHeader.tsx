import Link from "next/link";
import type { Category, Shop } from "@/generated/prisma/client";
import { CartLink } from "./CartLink";
import { MenuIcon, SearchIcon, UserIcon } from "./icons";
import styles from "./StoreHeader.module.scss";

const MAX_MENU_ITEMS = 5;

type Props = { shop: Pick<Shop, "id" | "name" | "logoUrl" | "announcement">; categories: Pick<Category, "id" | "name">[] };

export function StoreHeader({ shop, categories }: Props) {
  const menu = [
    ...categories.slice(0, MAX_MENU_ITEMS).map((category) => ({
      href: `/products?category=${category.id}`,
      label: category.name,
    })),
    { href: "/products", label: categories.length ? "Shop all" : "Products" },
  ];

  return (
    <>
      {shop.announcement && <div className={styles.announcement}>{shop.announcement}</div>}
      <header className={styles.header}>
        <div className={styles.inner}>
          <nav className={styles.menu} aria-label="Shop categories">
            {menu.map((item) => (
              <Link key={item.href} href={item.href} className={styles.menuLink}>
                {item.label}
              </Link>
            ))}
          </nav>
          <details className={styles.mobileMenu}>
            <summary aria-label="Menu">
              <MenuIcon className={styles.icon} />
            </summary>
            <nav className={styles.mobilePanel} aria-label="Shop categories">
              {menu.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>

          <Link href="/" className={styles.brand}>
            {shop.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logoUrl} alt={shop.name} className={styles.logo} />
            ) : (
              shop.name
            )}
          </Link>

          <div className={styles.tools}>
            <Link href="/products" className={styles.iconLink} aria-label="Search products">
              <SearchIcon className={styles.icon} />
            </Link>
            <Link href="/account" className={styles.iconLink} aria-label="My account">
              <UserIcon className={styles.icon} />
            </Link>
            <CartLink shopId={shop.id} />
          </div>
        </div>
      </header>
    </>
  );
}
