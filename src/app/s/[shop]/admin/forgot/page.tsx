import Link from "next/link";
import styles from "@/components/ui/AuthCard.module.scss";
import { EmailOnlyForm } from "@/components/store/AccountForms";
import ui from "@/components/ui/ui.module.scss";
import { requireShop } from "@/lib/tenant";
import { requestStaffReset } from "../actions";

export const metadata = { title: "Reset admin password" };

export default async function StaffForgotPage() {
  const shop = await requireShop();
  return (
    <main className={styles.page}>
      <div className={`${ui.card} ${styles.card}`}>
        <div>
          <p className={styles.eyebrow}>{shop.name}</p>
          <h1 className={styles.title}>Reset your password</h1>
        </div>
        <EmailOnlyForm action={requestStaffReset} button="Send reset link" />
        <Link href="/admin/login">Back to sign in</Link>
      </div>
    </main>
  );
}
