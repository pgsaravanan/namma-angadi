import { notFound } from "next/navigation";
import styles from "@/components/admin/AdminShell.module.scss";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireShopPermission } from "@/lib/auth";
import { listCategories } from "@/lib/categories";
import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/money";
import { saveProduct } from "../actions";

export default async function EditProductPage({ params }: PageProps<"/s/[shop]/admin/products/[id]">) {
  const { id } = await params;
  const { shop } = await requireShopPermission("products:manage");
  const [product, categories] = await Promise.all([
    db.product.findFirst({ where: { id, shopId: shop.id } }),
    listCategories(shop.id),
  ]);
  if (!product) notFound();

  return (
    <div className={styles.section}>
      <h1 className={styles.pageTitle}>Edit product</h1>
      <ProductForm
        action={saveProduct.bind(null, product.id)}
        categories={categories}
        product={{ ...product, price: paiseToRupees(product.pricePaise) }}
      />
    </div>
  );
}
