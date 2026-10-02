import { TickerTrack } from "./SpotlightParts";
import styles from "./CustomerStories.module.scss";
import { FramedMedia } from "./FramedMedia";

export type Story = { id: string; caption: string; customerName: string | null; place: string | null; mediaUrl: string };

export function CustomerStories({ stories }: { stories: Story[] }) {
  return (
    <section className={styles.section} aria-labelledby="happy-customers">
      <div className={styles.header}>
        <span className={styles.eyebrow}>Delivered with love</span>
        <h2 id="happy-customers" className={styles.title}>
          From our happy customers
        </h2>
      </div>
      <TickerTrack axis="x" className={styles.track}>
        {stories.map((story) => (
          <figure key={story.id} className={styles.card}>
            <FramedMedia url={story.mediaUrl} className={styles.mediaWrap} />
            <figcaption className={styles.caption}>
              <p>{story.caption}</p>
              {(story.customerName || story.place) && (
                <span className={styles.who}>
                  {story.customerName && <strong>{story.customerName}</strong>}
                  {story.customerName && story.place && " · "}
                  {story.place}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </TickerTrack>
    </section>
  );
}
