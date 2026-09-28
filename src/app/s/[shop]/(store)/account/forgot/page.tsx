import Link from "next/link";
import { EmailOnlyForm } from "@/components/store/AccountForms";
import ui from "@/components/ui/ui.module.scss";
import styles from "../../store.module.scss";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className={styles.container}>
      <div className={styles.narrow}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={ui.muted}>Enter the email you signed up with and we&apos;ll send you a link.</p>
        <div className={ui.card}>
          <EmailOnlyForm action={requestPasswordReset} button="Send reset link" />
        </div>
        <p className={styles.switchLink}>
          <Link href="/account/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
