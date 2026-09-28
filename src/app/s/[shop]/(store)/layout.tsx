import Link from "next/link";
import { StoreHeader } from "@/components/store/StoreHeader";
import { listCategories } from "@/lib/categories";
import { formatIndianMobile } from "@/lib/india";
import { POLICIES } from "@/lib/policies";
import { openingHoursText, shopAvailability } from "@/lib/shop-hours";
import { requireShop } from "@/lib/tenant";
import styles from "./store.module.scss";

export async function generateMetadata() {
  const shop = await requireShop();
  return { title: { default: shop.name, template: `%s · ${shop.name}` }, description: shop.about ?? undefined };
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const shop = await requireShop();

  if (shop.status !== "ACTIVE") {
    return (
      <main className={styles.unavailable}>
        <h1>{shop.name}</h1>
        <p>This shop is currently unavailable. Please check back later.</p>
      </main>
    );
  }

  const categories = await listCategories(shop.id);
  const availability = shopAvailability(shop);
  const hours = openingHoursText(shop);

  return (
    <>
      <StoreHeader shop={shop} categories={categories} />
      {!availability.open && <div className={styles.closedBar}>{availability.message}</div>}
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerName}>{shop.name}</div>
            {shop.about && <p>{shop.about}</p>}
          </div>
          <div>
            <h2 className={styles.footerTitle}>Shop</h2>
            <ul className={styles.footerLinks}>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={`/products?category=${category.id}`}>{category.name}</Link>
                </li>
              ))}
              <li>
                <Link href="/products">All products</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className={styles.footerTitle}>Contact</h2>
            <ul className={styles.footerLinks}>
              {shop.contactName && <li>{shop.contactName}</li>}
              {shop.address && <li>{shop.address}</li>}
              {shop.supportPhone && (
                <li>
                  <a href={`tel:+91${shop.supportPhone}`}>{formatIndianMobile(shop.supportPhone)}</a>
                </li>
              )}
              {shop.supportEmail && (
                <li>
                  <a href={`mailto:${shop.supportEmail}`}>{shop.supportEmail}</a>
                </li>
              )}
              {hours && <li>{hours}</li>}
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>
            © {new Date().getFullYear()} {shop.legalName ?? shop.name}
            {shop.fssaiNumber && ` · FSSAI Lic. No. ${shop.fssaiNumber}`}
            {shop.gstin && ` · GSTIN ${shop.gstin}`}
          </span>
          <nav className={styles.footerLegal} aria-label="Shop policies">
            {POLICIES.map((policy) => (
              <Link key={policy.slug} href={`/policies/${policy.slug}`}>
                {policy.title}
              </Link>
            ))}
          </nav>
          <span>Secure UPI payments · Powered by Namma Angadi</span>
        </div>
      </footer>
    </>
  );
}
