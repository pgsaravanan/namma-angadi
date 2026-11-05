import styles from "./CustomerStories.module.scss";
import type { MediaPlaceholder } from "./FramedMedia";
import { StoryCards, type Story } from "./StoryCards";

export type { Story };

export function CustomerStories({ stories, placeholder }: { stories: Story[]; placeholder: MediaPlaceholder }) {
  return (
    <section className={styles.section} aria-labelledby="happy-customers">
      <div className={styles.header}>
        <span className={styles.eyebrow}>Delivered with love</span>
        <h2 id="happy-customers" className={styles.title}>
          From our happy customers
        </h2>
      </div>
      <StoryCards stories={stories} placeholder={placeholder} />
    </section>
  );
}
