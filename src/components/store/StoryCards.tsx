"use client";

import { useRef, useState } from "react";
import styles from "./CustomerStories.module.scss";
import { FramedMedia, type MediaPlaceholder } from "./FramedMedia";
import { CloseIcon } from "./icons";
import { TickerTrack } from "./SpotlightParts";

export type Story = { id: string; caption: string; customerName: string | null; place: string | null; mediaUrl: string | null };

function Who({ story }: { story: Story }) {
  if (!story.customerName && !story.place) return null;
  return (
    <span className={styles.who}>
      {story.customerName && <strong>{story.customerName}</strong>}
      {story.customerName && story.place && " · "}
      {story.place}
    </span>
  );
}

export function StoryCards({ stories, placeholder }: { stories: Story[]; placeholder: MediaPlaceholder }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<Story | null>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <TickerTrack axis="x" className={styles.track}>
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            className={styles.card}
            onClick={() => {
              setOpen(story);
              dialog.current?.showModal();
            }}
          >
            <FramedMedia url={story.mediaUrl} className={styles.mediaWrap} placeholder={placeholder} />
            <span className={styles.caption}>
              <span className={styles.text}>{story.caption}</span>
              <Who story={story} />
            </span>
          </button>
        ))}
      </TickerTrack>
      <dialog
        ref={dialog}
        className={styles.viewer}
        aria-label="Customer story"
        onClose={() => setOpen(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        {open && (
          <figure className={styles.viewerBody}>
            <button type="button" className={styles.viewerClose} aria-label="Close" onClick={close}>
              <CloseIcon className={styles.viewerCloseIcon} />
            </button>
            {open.mediaUrl && <FramedMedia url={open.mediaUrl} className={styles.viewerMedia} alt={open.caption} />}
            <figcaption className={styles.viewerCaption}>
              <p>{open.caption}</p>
              <Who story={open} />
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
