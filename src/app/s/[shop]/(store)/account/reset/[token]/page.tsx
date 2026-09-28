import Link from "next/link";
import { NewPasswordForm } from "@/components/store/AccountForms";
import ui from "@/components/ui/ui.module.scss";
import { findValidResetToken } from "@/lib/password-reset";
import styles from "../../../store.module.scss";
import { resetPassword } from "../../actions";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ params }: PageProps<"/s/[shop]/account/reset/[token]">) {
  const { token } = await params;
  const valid = await findValidResetToken(token, "reset");

  return (
    <div className={styles.container}>
      <div className={styles.narrow}>
        <h1 className={styles.title}>Choose a new password</h1>
        {valid?.customerAccountId ? (
          <div className={ui.card}>
            <NewPasswordForm action={resetPassword.bind(null, token)} />
          </div>
        ) : (
          <p className={`${ui.message} ${ui.error}`}>
            This link has expired or was already used. <Link href="/account/forgot">Ask for a new one</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
