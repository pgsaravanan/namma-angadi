import Link from "next/link";
import ui from "@/components/ui/ui.module.scss";
import styles from "./landing.module.scss";

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Namma Angadi</p>
      <h1 className={styles.title}>Your shop, online, in minutes.</h1>
      <p className={styles.lead}>
        Add your products, share your shop link and get paid by UPI straight into your own bank account.
      </p>
      <Link href="/login" className={ui.button}>
        Platform sign in
      </Link>
    </main>
  );
}
