import styles from "@/components/admin/AdminShell.module.scss";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireShopPermission } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { saveProduct } from "../actions";

export default async function NewProductPage() {
  const { shop } = await requireShopPermission("products:manage");
  const categories = await listCategories(shop.id);

  return (
    <div className={styles.section}>
      <h1 className={styles.pageTitle}>Add product</h1>
      <ProductForm action={saveProduct.bind(null, null)} categories={categories} />
    </div>
  );
}
