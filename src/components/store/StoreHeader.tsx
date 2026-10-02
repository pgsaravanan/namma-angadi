import Link from "next/link";
import type { Category, Shop } from "@/generated/prisma/client";
import { AnnouncementBar, type Announcement } from "./AnnouncementBar";
import { CartLink } from "./CartLink";
import { SearchIcon, UserIcon } from "./icons";
import { MobileMenu } from "./MobileMenu";
import styles from "./StoreHeader.module.scss";

const MAX_MENU_ITEMS = 4;

type Props = {
  shop: Pick<Shop, "id" | "name" | "logoUrl">;
  categories: Pick<Category, "id" | "name">[];
  announcements: Announcement[];
};

export function StoreHeader({ shop, categories, announcements }: Props) {
  const menu = [
    ...categories.slice(0, MAX_MENU_ITEMS).map((category) => ({
      href: `/products?category=${category.id}`,
      label: category.name,
    })),
    { href: "/products", label: categories.length ? "Shop all" : "Products" },
  ];

  return (
    <div className={styles.sticky}>
      <AnnouncementBar announcements={announcements} />
      <header className={styles.header}>
        <div className={styles.inner}>
          <nav className={styles.menu} aria-label="Shop categories">
            {[{ href: "/", label: "Home" }, ...menu, { href: "/contact", label: "Contact us" }].map((item) => (
              <Link key={item.href} href={item.href} className={styles.menuLink}>
                {item.label}
              </Link>
            ))}
          </nav>
          <MobileMenu shopName={shop.name} items={menu} />

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
    </div>
  );
}
