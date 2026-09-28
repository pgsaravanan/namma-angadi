import styles from "@/components/admin/AdminShell.module.scss";
import { MemberForm } from "@/components/admin/MemberForm";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/permissions";
import { addMember, removeMember } from "./actions";

export default async function TeamPage() {
  const { shop, staff } = await requireShopPermission("team:manage");
  const members = await db.membership.findMany({
    where: { shopId: shop.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className={styles.section}>
      <h1 className={styles.pageTitle}>Team</h1>

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Members</h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.user.name}</td>
                  <td>{member.user.email}</td>
                  <td>{ROLE_LABELS[member.role]}</td>
                  <td>
                    {member.userId !== staff.user.id && (
                      <form action={removeMember.bind(null, member.id)}>
                        <button type="submit" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
                          Remove
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Add a team member</h2>
        <MemberForm action={addMember} />
      </section>
    </div>
  );
}
