import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { defaultPolicy, isPolicySlug, POLICIES } from "@/lib/policies";
import { requireShop } from "@/lib/tenant";
import styles from "../../store.module.scss";

async function loadPolicy(slug: string) {
  if (!isPolicySlug(slug)) return null;
  const shop = await requireShop();
  const saved = await db.shopPolicy.findUnique({ where: { shopId_slug: { shopId: shop.id, slug } } });
  const title = POLICIES.find((policy) => policy.slug === slug)!.title;
  return { title: saved?.title ?? title, body: saved?.body ?? defaultPolicy(slug, shop) };
}

export async function generateMetadata({ params }: PageProps<"/s/[shop]/policies/[slug]">) {
  const policy = await loadPolicy((await params).slug);
  return policy ? { title: policy.title } : {};
}

export default async function PolicyPage({ params }: PageProps<"/s/[shop]/policies/[slug]">) {
  const policy = await loadPolicy((await params).slug);
  if (!policy) notFound();

  const blocks = policy.body.split(/\n{2,}/);

  return (
    <div className={styles.container}>
      <article className={styles.policy}>
        <h1 className={styles.title}>{policy.title}</h1>
        {blocks.map((block, index) => {
          const lines = block.split("\n");
          if (lines.every((line) => line.startsWith("- "))) {
            return (
              <ul key={index}>
                {lines.map((line) => (
                  <li key={line}>{line.slice(2)}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index}>
              {lines.map((line, lineIndex) => (
                <span key={lineIndex}>
                  {line}
                  {lineIndex < lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
        })}
      </article>
    </div>
  );
}
