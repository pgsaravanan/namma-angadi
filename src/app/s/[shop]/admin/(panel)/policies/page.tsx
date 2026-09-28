import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import { PolicyForm } from "@/components/admin/PolicyForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultPolicy, POLICIES } from "@/lib/policies";
import { resetPolicy, savePolicy } from "./actions";

export default async function PoliciesPage() {
  const { shop } = await requireShopPermission("settings:manage");
  const saved = await db.shopPolicy.findMany({ where: { shopId: shop.id } });

  return (
    <div className={styles.section}>
      <div>
        <h1 className={styles.pageTitle}>Policies</h1>
        <p className={ui.muted}>
          These pages are linked at the bottom of your store. Payment providers such as Razorpay check them before
          approving live payments. They start from a template filled in with your shop details, so please read them and
          change anything that doesn&apos;t match how you work. This is not legal advice.
        </p>
      </div>
      {POLICIES.map((policy) => {
        const custom = saved.find((entry) => entry.slug === policy.slug);
        return (
          <section key={policy.slug} className={ui.card}>
            <div className={styles.pageHeader}>
              <h2 className={styles.cardTitle}>
                {policy.title} <span className={ui.muted}>· {custom ? "edited" : "template"}</span>
              </h2>
              <div className={styles.actions}>
                <Link href={`/policies/${policy.slug}`} target="_blank" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
                  View ↗
                </Link>
                {custom && (
                  <ConfirmButton action={resetPolicy.bind(null, policy.slug)} message="Go back to the template? Your edits will be lost.">
                    Use template
                  </ConfirmButton>
                )}
              </div>
            </div>
            <PolicyForm
              action={savePolicy.bind(null, policy.slug)}
              title={custom?.title ?? policy.title}
              body={custom?.body ?? defaultPolicy(policy.slug, shop)}
            />
          </section>
        );
      })}
    </div>
  );
}
