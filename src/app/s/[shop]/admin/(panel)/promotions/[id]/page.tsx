import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/admin/AdminShell.module.scss";
import { PromotionForm } from "@/components/admin/PromotionForms";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { toIndiaInputValue } from "@/lib/dates";
import { db } from "@/lib/db";
import { updatePromotion } from "../actions";

export default async function EditPromotionPage({ params }: PageProps<"/s/[shop]/admin/promotions/[id]">) {
  const { id } = await params;
  const { shop } = await requireShopPermission("marketing:manage");
  const promotion = await db.promotion.findFirst({
    where: { id, shopId: shop.id },
    include: { products: { select: { id: true } } },
  });
  if (!promotion) notFound();

  const pickedIds = promotion.products.map((product) => product.id);
  const [products, coupons] = await Promise.all([
    db.product.findMany({
      where: { shopId: shop.id, OR: [{ isActive: true }, { id: { in: pickedIds } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, imageUrl: true },
    }),
    db.coupon.findMany({
      where: {
        shopId: shop.id,
        OR: [{ isActive: true }, ...(promotion.couponId ? [{ id: promotion.couponId }] : [])],
      },
      orderBy: { code: "asc" },
      select: { id: true, code: true },
    }),
  ]);

  return (
    <div className={styles.section}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Edit spotlight</h1>
        <Link href="/admin/promotions" className={`${ui.button} ${ui.secondary}`}>
          Back
        </Link>
      </div>
      <section className={ui.card}>
        <PromotionForm
          action={updatePromotion.bind(null, promotion.id)}
          products={products}
          coupons={coupons}
          initial={{
            kind: promotion.kind,
            title: promotion.title,
            subtitle: promotion.subtitle ?? "",
            couponId: promotion.couponId ?? "",
            endsAt: promotion.endsAt ? toIndiaInputValue(promotion.endsAt) : "",
            mediaUrl: promotion.mediaUrl,
            productIds: pickedIds,
          }}
        />
      </section>
    </div>
  );
}
