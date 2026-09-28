import Link from "next/link";
import styles from "@/components/ui/AuthCard.module.scss";
import { WelcomeForm } from "@/components/admin/WelcomeForm";
import ui from "@/components/ui/ui.module.scss";
import { db } from "@/lib/db";
import { findValidResetToken } from "@/lib/password-reset";
import { requireShop } from "@/lib/tenant";
import { acceptInvite } from "../../actions";

export const metadata = { title: "Welcome", robots: { index: false } };

export default async function WelcomePage({ params }: PageProps<"/s/[shop]/admin/welcome/[token]">) {
  const { token } = await params;
  const shop = await requireShop();
  const invite = await findValidResetToken(token, "invite");
  const user = invite?.userId ? await db.user.findUnique({ where: { id: invite.userId } }) : null;

  return (
    <main className={styles.page}>
      <div className={`${ui.card} ${styles.card}`}>
        <div>
          <p className={styles.eyebrow}>{shop.name}</p>
          <h1 className={styles.title}>{user ? `Welcome, ${user.name.split(" ")[0]}!` : "Welcome"}</h1>
        </div>
        {user ? (
          <>
            <p className={ui.muted}>
              Choose a password for <strong>{user.email}</strong>. You&apos;ll use it to sign in to your shop&apos;s admin.
            </p>
            <WelcomeForm action={acceptInvite.bind(null, token)} />
          </>
        ) : (
          <p className={`${ui.message} ${ui.error}`}>
            This invite link has expired or was already used. Ask the person who invited you for a new link, or{" "}
            <Link href="/admin/login">sign in</Link> if you already set your password.
          </p>
        )}
      </div>
    </main>
  );
}
