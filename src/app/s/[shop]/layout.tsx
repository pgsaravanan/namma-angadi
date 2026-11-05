import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/store/ServiceWorker";
import { appIconVersion } from "@/lib/app-icon";
import { isTestSite } from "@/lib/payments";
import { requireShop } from "@/lib/tenant";
import { shopTheme, shopThemeColors } from "@/lib/themes";
import themes from "./themes.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  const shop = await requireShop();
  const icon = shop.iconUrl ?? "/shop-icon";
  const hidden = isTestSite() && !shop.isLive;
  return {
    icons: { icon, shortcut: icon, apple: `/app-icon/apple?v=${appIconVersion(shop)}` },
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: shop.name, statusBarStyle: "default" },
    robots: { index: !hidden, follow: !hidden },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const shop = await requireShop();
  return { themeColor: shopThemeColors(shop.theme).color };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const shop = await requireShop();
  return (
    <div className={themes.theme} data-theme={shopTheme(shop.theme)}>
      {isTestSite() && !shop.isLive && (
        <div className="test-site-banner">Test site · no real payments, orders are not delivered</div>
      )}
      {children}
      <ServiceWorker />
    </div>
  );
}
