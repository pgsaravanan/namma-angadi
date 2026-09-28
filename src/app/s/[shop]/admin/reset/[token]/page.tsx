import Link from "next/link";
import styles from "@/components/ui/AuthCard.module.scss";
import { NewPasswordForm } from "@/components/store/AccountForms";
import ui from "@/components/ui/ui.module.scss";
import { findValidResetToken } from "@/lib/password-reset";
import { resetStaffPassword } from "../../actions";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function StaffResetPage({ params }: PageProps<"/s/[shop]/admin/reset/[token]">) {
  const { token } = await params;
  const valid = await findValidResetToken(token, "reset");

  return (
    <main className={styles.page}>
      <div className={`${ui.card} ${styles.card}`}>
        <h1 className={styles.title}>Choose a new password</h1>
        {valid?.userId ? (
          <NewPasswordForm action={resetStaffPassword.bind(null, token)} />
        ) : (
          <p className={`${ui.message} ${ui.error}`}>
            This link has expired or was already used. <Link href="/admin/forgot">Ask for a new one</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
