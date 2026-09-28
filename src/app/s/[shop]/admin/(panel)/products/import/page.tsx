import styles from "@/components/admin/AdminShell.module.scss";
import { ProductImport } from "@/components/admin/ProductImport";
import { requireShopPermission } from "@/lib/auth";
import { commitImport, previewImport } from "./actions";

export default async function ImportProductsPage() {
  await requireShopPermission("products:manage");

  return (
    <div className={styles.section}>
      <h1 className={styles.pageTitle}>Import products</h1>
      <ProductImport preview={previewImport} commit={commitImport} />
    </div>
  );
}
