import { requireShop } from "@/lib/tenant";

export async function generateMetadata() {
  const shop = await requireShop();
  const icon = shop.iconUrl ?? "/shop-icon";
  return { icons: { icon, shortcut: icon, apple: icon } };
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
