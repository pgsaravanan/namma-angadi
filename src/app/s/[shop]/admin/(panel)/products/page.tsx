import Link from "next/link";
import styles from "@/components/admin/AdminShell.module.scss";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatStockAmount, isStockUnit, productStock } from "@/lib/stock";

export default async function ProductsPage() {
  const { shop } = await requireShopPermission("products:manage");
  const products = await db.product.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "desc" },
    include: { category: true, variants: { select: { stock: true, packAmount: true } } },
  });

  return (
    <div className={styles.section}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Products</h1>
        <div className={styles.actions}>
          <Link href="/admin/products/import" className={`${ui.button} ${ui.secondary}`}>
            Import from CSV
          </Link>
          <Link href="/admin/products/new" className={ui.button}>
            Add product
          </Link>
        </div>
      </div>
      <section className={ui.card}>
        {products.length === 0 ? (
          <p className={ui.empty}>No products yet. Add your first product to start selling.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th />
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Visible</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt="" className={styles.thumb} />
                      ) : (
                        <span className={styles.thumb} />
                      )}
                    </td>
                    <td>{product.name}</td>
                    <td className={ui.muted}>{product.category?.name ?? "—"}</td>
                    <td>{formatPaise(product.pricePaise)}</td>
                    <td>
                      {isStockUnit(product.stockUnit)
                        ? formatStockAmount(product.stock, product.stockUnit)
                        : productStock(product)}
                    </td>
                    <td>{product.isActive ? "Yes" : "Hidden"}</td>
                    <td>
                      <Link href={`/admin/products/${product.id}`} className={`${ui.button} ${ui.secondary} ${ui.small}`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
