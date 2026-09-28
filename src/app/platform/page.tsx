import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import { NewInviteButton } from "@/components/admin/MemberForm";
import { CreateShopForm, CustomDomainForm, SenderEmailForm } from "@/components/admin/PlatformForms";
import ui from "@/components/ui/ui.module.scss";
import { requirePlatformAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { shopBaseUrl } from "@/lib/host";
import { PAID_STATUSES } from "@/lib/order-status";
import { PROVIDERS, isProviderId } from "@/lib/payments/catalog";
import { logoutFromPlatform } from "../login/actions";
import { createShop, newOwnerInvite, setCustomDomain, setSenderEmail, toggleShopStatus } from "./actions";

export const metadata = { title: "Platform · Namma Angadi", robots: { index: false } };

export default async function PlatformPage() {
  const admin = await requirePlatformAdmin();
  const shops = await db.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: { where: { role: "SUPER_ADMIN" }, include: { user: true }, take: 1 },
      _count: { select: { orders: { where: { status: { in: [...PAID_STATUSES] } } } } },
    },
  });

  return (
    <>
      <header className={styles.topbar}>
        <strong className={styles.shopName}>Namma Angadi · Platform</strong>
        <div className={styles.actions}>
          <Link href="/platform/emails" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
            Email log
          </Link>
          <span className={ui.muted}>{admin.name}</span>
          <form action={logoutFromPlatform}>
            <button type="submit" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className={`${styles.platformContent} ${styles.section}`}>
        <section className={ui.card}>
          <h2 className={styles.cardTitle}>Create a shop</h2>
          <CreateShopForm action={createShop} rootDomain={env.rootDomain} />
        </section>

        <section className={ui.card}>
          <h2 className={styles.cardTitle}>Shops ({shops.length})</h2>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Owner</th>
                  <th>Payments</th>
                  <th>Paid orders</th>
                  <th>Custom domain</th>
                  <th>Sends email from</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => {
                  const url = shopBaseUrl(shop.slug, env.rootDomain, shop.customDomain);
                  return (
                    <tr key={shop.id}>
                      <td>
                        <strong>{shop.name}</strong>
                        <div>
                          <a href={url} target="_blank" rel="noreferrer">
                            {url.replace(/^https?:\/\//, "")}
                          </a>{" "}
                          · <a href={`${url}/admin`}>admin</a>
                        </div>
                      </td>
                      <td>
                        {shop.members[0]?.user.email ?? "—"}
                        {shop.members[0] && !shop.members[0].user.passwordSetAt && (
                          <>
                            <div className={ui.hint}>Invite pending</div>
                            <NewInviteButton action={newOwnerInvite.bind(null, shop.id, shop.members[0].userId)} />
                          </>
                        )}
                      </td>
                      <td>{isProviderId(shop.paymentProvider) ? PROVIDERS[shop.paymentProvider].label : "Not set up"}</td>
                      <td>{shop._count.orders}</td>
                      <td>
                        <CustomDomainForm action={setCustomDomain.bind(null, shop.id)} domain={shop.customDomain} />
                      </td>
                      <td>
                        <SenderEmailForm action={setSenderEmail.bind(null, shop.id)} senderEmail={shop.senderEmail} />
                      </td>
                      <td>
                        <form action={toggleShopStatus.bind(null, shop.id)}>
                          <button type="submit" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
                            {shop.status === "ACTIVE" ? "Active · Suspend" : "Suspended · Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
