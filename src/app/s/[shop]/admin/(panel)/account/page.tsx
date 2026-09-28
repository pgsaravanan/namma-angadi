import styles from "@/components/admin/AdminShell.module.scss";
import { ChangePasswordForm } from "@/components/admin/PasswordForms";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { changePassword } from "../../actions";

export default async function StaffAccountPage() {
  const { staff } = await requireShopPermission("dashboard:view");

  return (
    <div className={styles.section}>
      <h1 className={styles.pageTitle}>My login</h1>
      <section className={ui.card}>
        <p>
          <strong>{staff.user.name}</strong> · {staff.user.email} · {ROLE_LABELS[staff.role]}
        </p>
        <h2 className={styles.cardTitle}>Change password</h2>
        <ChangePasswordForm action={changePassword} />
      </section>
    </div>
  );
}
