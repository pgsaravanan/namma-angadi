import { redirect } from "next/navigation";
import styles from "@/components/ui/AuthCard.module.scss";
import { LoginForm } from "@/components/ui/LoginForm";
import ui from "@/components/ui/ui.module.scss";
import { getSession } from "@/lib/auth";
import { loginToPlatform } from "./actions";

export const metadata = { title: "Platform sign in · Namma Angadi" };

export default async function PlatformLoginPage() {
  const session = await getSession();
  if (session && session.shopId === null && session.user.isPlatformAdmin) redirect("/platform");

  return (
    <main className={styles.page}>
      <div className={`${ui.card} ${styles.card}`}>
        <div>
          <p className={styles.eyebrow}>Namma Angadi</p>
          <h1 className={styles.title}>Platform admin</h1>
        </div>
        <LoginForm action={loginToPlatform} />
      </div>
    </main>
  );
}
