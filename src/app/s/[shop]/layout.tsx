import { requireShop } from "@/lib/tenant";
import { shopTheme } from "@/lib/themes";
import themes from "./themes.module.scss";

export async function generateMetadata() {
  const shop = await requireShop();
  const icon = shop.iconUrl ?? "/shop-icon";
  return { icons: { icon, shortcut: icon, apple: icon } };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const shop = await requireShop();
  return (
    <div className={themes.theme} data-theme={shopTheme(shop.theme)}>
      {children}
    </div>
  );
}
