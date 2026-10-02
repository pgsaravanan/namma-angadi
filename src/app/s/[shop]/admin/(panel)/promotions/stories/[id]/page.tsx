import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/admin/AdminShell.module.scss";
import { StoryForm } from "@/components/admin/PromotionForms";
import ui from "@/components/ui/ui.module.scss";
import { requireShopPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateStory } from "../../actions";

export default async function EditStoryPage({ params }: PageProps<"/s/[shop]/admin/promotions/stories/[id]">) {
  const { id } = await params;
  const { shop } = await requireShopPermission("marketing:manage");
  const story = await db.customerStory.findFirst({ where: { id, shopId: shop.id } });
  if (!story) notFound();

  return (
    <div className={styles.section}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Edit happy customer</h1>
        <Link href="/admin/promotions#stories" className={`${ui.button} ${ui.secondary}`}>
          Back
        </Link>
      </div>
      <section className={ui.card}>
        <StoryForm
          action={updateStory.bind(null, story.id)}
          initial={{
            caption: story.caption,
            customerName: story.customerName ?? "",
            place: story.place ?? "",
            mediaUrl: story.mediaUrl,
          }}
        />
      </section>
    </div>
  );
}
