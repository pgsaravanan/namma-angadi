import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/store/AccountForms";
import ui from "@/components/ui/ui.module.scss";
import { getCustomerAccount } from "@/lib/customer-auth";
import { safeLocalPath } from "@/lib/safe-redirect";
import { requireShop } from "@/lib/tenant";
import styles from "../../store.module.scss";
import { signIn } from "../actions";

export const metadata = { title: "Sign in" };

export default async function CustomerLoginPage({ searchParams }: PageProps<"/s/[shop]/account/login">) {
  const shop = await requireShop();
  const { next } = await searchParams;
  const nextPath = safeLocalPath(next);
  if (await getCustomerAccount(shop.id)) redirect(nextPath);

  return (
    <div className={styles.container}>
      <div className={styles.narrow}>
        <h1 className={styles.title}>Sign in</h1>
        <div className={ui.card}>
          <SignInForm action={signIn} next={nextPath} />
        </div>
        <p className={styles.switchLink}>
          <Link href="/account/forgot">Forgot password?</Link> · New here?{" "}
          <Link href={`/account/register?next=${encodeURIComponent(nextPath)}`}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
