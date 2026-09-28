import styles from "@/components/admin/AdminShell.module.scss";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteCategory, moveCategory, saveCategory } from "./actions";

export default async function CategoriesPage() {
  const { shop } = await requireShopPermission("products:manage");
  const categories = await db.category.findMany({
    where: { shopId: shop.id },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className={styles.section}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Categories</h1>
          <p className={ui.muted}>They appear in this order in your store menu and on the home page.</p>
        </div>
      </div>

      {categories.length === 0 && <p className={`${ui.card} ${ui.empty}`}>No categories yet. Add your first one below.</p>}

      {categories.map((category, index) => (
        <section key={category.id} className={ui.card}>
          <div className={styles.pageHeader}>
            <h2 className={styles.cardTitle}>
              {category.name}{" "}
              <span className={ui.muted}>
                · {category._count.products} product{category._count.products === 1 ? "" : "s"}
              </span>
            </h2>
            <div className={styles.actions}>
              <form action={moveCategory.bind(null, category.id, "up")}>
                <button type="submit" className={`${ui.button} ${ui.secondary} ${ui.small}`} disabled={index === 0} aria-label="Move up">
                  ↑
                </button>
              </form>
              <form action={moveCategory.bind(null, category.id, "down")}>
                <button
                  type="submit"
                  className={`${ui.button} ${ui.secondary} ${ui.small}`}
                  disabled={index === categories.length - 1}
                  aria-label="Move down"
                >
                  ↓
                </button>
              </form>
              <ConfirmButton
                action={deleteCategory.bind(null, category.id)}
                message={`Delete "${category.name}"? Its products stay in your shop without a category.`}
              >
                Delete
              </ConfirmButton>
            </div>
          </div>
          <CategoryForm action={saveCategory.bind(null, category.id)} category={category} />
        </section>
      ))}

      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Add a category</h2>
        <CategoryForm action={saveCategory.bind(null, null)} />
      </section>
    </div>
  );
}
