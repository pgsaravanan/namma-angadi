import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { ProductGrid } from "@/components/store/ProductCard";
import { PageLoading } from "@/components/ui/PageLoading";
import { PendingButton, PendingLink } from "@/components/ui/PendingButton";
import ui from "@/components/ui/ui.module.scss";
import { listCategories } from "@/lib/categories";
import { db } from "@/lib/db";
import { releaseExpiredOrders } from "@/lib/orders";
import { withRatings } from "@/lib/reviews";
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

async function ProductResults({ shopId, categoryId, query, sortKey }: { shopId: string; categoryId?: string; query: string; sortKey: string }) {
  await releaseExpiredOrders(shopId);
  const needle = query.toLowerCase();
  const found = await db.product.findMany({
    where: { shopId, isActive: true, ...(categoryId && { categoryId }) },
    orderBy: (SORTS[sortKey] ?? SORTS.new).orderBy,
    include: { variants: { select: { pricePaise: true, stock: true, packAmount: true } } },
  });
  const products = await withRatings(
    shopId,
    found.filter(
      (product) =>
        !needle || product.name.toLowerCase().includes(needle) || product.description.toLowerCase().includes(needle),
    ),
  );

  return (
    <>
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
    </>
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/s/[shop]/products">) {
  const shop = await requireShop();
  const params = await searchParams;
  const categoryId = one(params.category);
  const query = one(params.q)?.trim().slice(0, 80) ?? "";
  const sortKey = one(params.sort) ?? "new";
  
  const categories = await listCategories(shop.id);
  const category = categories.find((candidate) => candidate.id === categoryId);

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
          <PendingLink href={linkFor()} className={`${styles.chip} ${!category ? styles.chipActive : ""}`}>
            All
          </PendingLink>
          {categories.map((candidate) => (
            <PendingLink
              key={candidate.id}
              href={linkFor(candidate.id)}
              className={`${styles.chip} ${candidate.id === category?.id ? styles.chipActive : ""}`}
            >
              {candidate.name}
            </PendingLink>
          ))}
        </nav>
        <Form className={styles.searchForm} action="/products">
          {category && <input type="hidden" name="category" value={category.id} />}
          <input className={ui.input} type="search" name="q" defaultValue={query} placeholder="Search products" aria-label="Search products" />
          <select className={ui.input} name="sort" defaultValue={sortKey} aria-label="Sort by">
            {Object.entries(SORTS).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </select>
          <PendingButton className={`${ui.button} ${ui.secondary}`}>Apply</PendingButton>
        </Form>
      </div>

      <Suspense key={`${category?.id ?? ""}|${query}|${sortKey}`} fallback={<PageLoading />}>
        <ProductResults shopId={shop.id} categoryId={category?.id} query={query} sortKey={sortKey} />
      </Suspense>
    </div>
  );
}
