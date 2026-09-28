import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/store/AccountForms";
import ui from "@/components/ui/ui.module.scss";
import { getCustomerAccount } from "@/lib/customer-auth";
import { safeLocalPath } from "@/lib/safe-redirect";
import { requireShop } from "@/lib/tenant";
import styles from "../../store.module.scss";
import { register } from "../actions";

export const metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: PageProps<"/s/[shop]/account/register">) {
  const shop = await requireShop();
  const { next } = await searchParams;
  const nextPath = safeLocalPath(next);
  if (await getCustomerAccount(shop.id)) redirect(nextPath);

  return (
    <div className={styles.container}>
      <div className={styles.narrow}>
        <h1 className={styles.title}>Create an account</h1>
        <p className={ui.muted}>See your orders and bills, save your address and check out faster.</p>
        <div className={ui.card}>
          <RegisterForm action={register} next={nextPath} />
        </div>
        <p className={styles.switchLink}>
          Already have an account? <Link href={`/account/login?next=${encodeURIComponent(nextPath)}`}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
