import { isTestSite } from "@/lib/payments";
import { requireShop } from "@/lib/tenant";
import { shopTheme } from "@/lib/themes";
import themes from "./themes.module.scss";

export async function generateMetadata() {
  const shop = await requireShop();
  const icon = shop.iconUrl ?? "/shop-icon";
  const hidden = isTestSite() && !shop.isLive;
  return { icons: { icon, shortcut: icon, apple: icon }, robots: { index: !hidden, follow: !hidden } };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const shop = await requireShop();
  return (
    <div className={themes.theme} data-theme={shopTheme(shop.theme)}>
      {isTestSite() && !shop.isLive && (
        <div className="test-site-banner">Test site · no real payments, orders are not delivered</div>
      )}
      {children}
    </div>
  );
}
