import { redirect } from "next/navigation";
import styles from "@/components/ui/AuthCard.module.scss";
import { LoginForm } from "@/components/ui/LoginForm";
import ui from "@/components/ui/ui.module.scss";
import { getShopStaff } from "@/lib/auth";
import { requireShop } from "@/lib/tenant";
import { loginToShop } from "../actions";

export const metadata = { title: "Shop admin sign in" };

export default async function ShopLoginPage() {
  const shop = await requireShop();
  if (await getShopStaff(shop.id)) redirect("/admin");

  return (
    <main className={styles.page}>
      <div className={`${ui.card} ${styles.card}`}>
        <div>
          <p className={styles.eyebrow}>{shop.name}</p>
          <h1 className={styles.title}>Shop admin</h1>
        </div>
        <LoginForm action={loginToShop} />
      </div>
    </main>
  );
}
