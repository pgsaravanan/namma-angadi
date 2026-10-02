import type { Story } from "./CustomerStories";
import styles from "./CustomerStories.module.scss";
import { FramedMedia } from "./FramedMedia";
import { TickerTrack } from "./SpotlightParts";

export function LatestDeliveries({ stories }: { stories: Story[] }) {
  return (
    <aside className={styles.panel} aria-labelledby="latest-deliveries">
      <div className={styles.panelInner}>
        <h2 id="latest-deliveries" className={styles.panelTitle}>
          <span className={styles.liveDot} aria-hidden />
          Latest deliveries
        </h2>
        <TickerTrack className={styles.feed}>
          {stories.map((story) => (
            <figure key={story.id} className={styles.feedItem}>
              <FramedMedia url={story.mediaUrl} className={styles.feedMedia} fit="cover" />
              <figcaption className={styles.feedText}>
                <p>{story.caption}</p>
                {(story.customerName || story.place) && (
                  <span className={styles.who}>{[story.customerName, story.place].filter(Boolean).join(" · ")}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </TickerTrack>
      </div>
    </aside>
  );
}
