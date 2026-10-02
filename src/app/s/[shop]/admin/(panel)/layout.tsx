import Link from "next/link";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";
import { NewOrderAlert } from "@/components/admin/NewOrderAlert";
import styles from "@/components/admin/AdminShell.module.scss";
import ui from "@/components/ui/ui.module.scss";
import { newOrderSnapshot } from "@/lib/admin-orders";
import { db } from "@/lib/db";
import { requireShopPermission } from "@/lib/auth";
import { can, ROLE_LABELS, type Permission } from "@/lib/permissions";
import { logoutFromShop } from "../actions";

const NAV: (NavItem & { permission: Permission })[] = [
  { href: "/admin", label: "Dashboard", permission: "dashboard:view" },
  { href: "/admin/orders", label: "Orders", permission: "orders:manage" },
  { href: "/admin/products", label: "Products", permission: "products:manage" },
  { href: "/admin/categories", label: "Categories", permission: "products:manage" },
  { href: "/admin/coupons", label: "Discounts", permission: "coupons:manage" },
  { href: "/admin/promotions", label: "Promotions", permission: "marketing:manage" },
  { href: "/admin/reviews", label: "Reviews", permission: "reviews:manage" },
  { href: "/admin/team", label: "Team", permission: "team:manage" },
  { href: "/admin/settings", label: "Settings", permission: "settings:manage" },
  { href: "/admin/policies", label: "Policies", permission: "settings:manage" },
];

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { shop, staff } = await requireShopPermission("dashboard:view");
  const [snapshot, pendingReviews] = await Promise.all([
    newOrderSnapshot(shop.id),
    db.productReview.count({ where: { shopId: shop.id, status: "PENDING" } }),
  ]);
  const items = NAV.filter((item) => can(staff.role, item.permission)).map(({ href, label }) => ({
    href,
    label,
    badge: href === "/admin/reviews" ? pendingReviews : undefined,
  }));

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.shopName}>{shop.name}</div>
          <Link href="/" className={styles.storeLink} target="_blank">
            View store ↗
          </Link>
        </div>
        <AdminNav items={items} />
        <div className={styles.user}>
          <div>
            <div className={styles.userName}>{staff.user.name}</div>
            <div className={ui.muted}>{staff.user.isPlatformAdmin ? "Platform admin" : ROLE_LABELS[staff.role]}</div>
            <Link href="/admin/account" className={ui.hint}>
              My login
            </Link>
          </div>
          <form action={logoutFromShop}>
            <button type="submit" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
      <NewOrderAlert initial={snapshot} />
    </div>
  );
}
