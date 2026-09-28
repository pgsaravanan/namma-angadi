import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { ProductGrid } from "@/components/store/ProductCard";
import ui from "@/components/ui/ui.module.scss";
import { listCategories } from "@/lib/categories";
import { db } from "@/lib/db";
import { releaseExpiredOrders } from "@/lib/orders";
import { requireShop } from "@/lib/tenant";
import styles from "../store.module.scss";

const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }> = {
  new: { label: "Newest", orderBy: { createdAt: "desc" } },
  "price-asc": { label: "Price: low to high", orderBy: { pricePaise: "asc" } },
  "price-desc": { label: "Price: high to low", orderBy: { pricePaise: "desc" } },
  name: { label: "Name", orderBy: { name: "asc" } },
};

export const metadata = { title: "Shop" };

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ProductsPage({ searchParams }: PageProps<"/s/[shop]/products">) {
  const shop = await requireShop();
  const params = await searchParams;
  const categoryId = one(params.category);
  const query = one(params.q)?.trim().slice(0, 80) ?? "";
  const sortKey = one(params.sort) ?? "new";
  const sort = SORTS[sortKey] ?? SORTS.new;

  await releaseExpiredOrders(shop.id);
  const categories = await listCategories(shop.id);
  const category = categories.find((candidate) => candidate.id === categoryId);

  const products = await db.product.findMany({
    where: {
      shopId: shop.id,
      isActive: true,
      ...(category && { categoryId: category.id }),
      ...(query && { OR: [{ name: { contains: query } }, { description: { contains: query } }] }),
    },
    orderBy: sort.orderBy,
  });

  const linkFor = (nextCategory?: string) => {
    const search = new URLSearchParams();
    if (nextCategory) search.set("category", nextCategory);
    if (query) search.set("q", query);
    if (sortKey !== "new") search.set("sort", sortKey);
    const text = search.toString();
    return text ? `/products?${text}` : "/products";
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{query ? `Results for “${query}”` : (category?.name ?? "All products")}</h1>

      <div className={styles.filters}>
        <nav className={styles.chips} aria-label="Categories">
          <Link href={linkFor()} className={`${styles.chip} ${!category ? styles.chipActive : ""}`}>
            All
          </Link>
          {categories.map((candidate) => (
            <Link
              key={candidate.id}
              href={linkFor(candidate.id)}
              className={`${styles.chip} ${candidate.id === category?.id ? styles.chipActive : ""}`}
            >
              {candidate.name}
            </Link>
          ))}
        </nav>
        <form className={styles.searchForm} action="/products">
          {category && <input type="hidden" name="category" value={category.id} />}
          <input className={ui.input} type="search" name="q" defaultValue={query} placeholder="Search products" aria-label="Search products" />
          <select className={ui.input} name="sort" defaultValue={sortKey} aria-label="Sort by">
            {Object.entries(SORTS).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className={`${ui.button} ${ui.secondary}`}>
            Apply
          </button>
        </form>
      </div>

      <p className={styles.resultCount}>
        {products.length} product{products.length === 1 ? "" : "s"}
      </p>
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <p className={ui.empty}>
          Nothing found. <Link href="/products">See all products</Link>
        </p>
      )}
    </div>
  );
}
