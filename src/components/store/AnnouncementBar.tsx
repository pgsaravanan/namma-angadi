"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./StoreHeader.module.scss";

const ROTATE_MS = 4500;

export type Announcement = { id: string; message: string; link: string | null };

export function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = announcements.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;
  const current = announcements[index % count];

  return (
    <div
      className={styles.announcement}
      role="region"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {count > 1 && (
        <button
          type="button"
          className={styles.announcementArrow}
          aria-label="Previous message"
          onClick={() => setIndex((index - 1 + count) % count)}
        >
          ‹
        </button>
      )}
      <div key={current.id} className={styles.announcementText} aria-live="polite">
        {current.link ? (
          current.link.startsWith("/") ? (
            <Link href={current.link}>{current.message}</Link>
          ) : (
            <a href={current.link} target="_blank" rel="noopener noreferrer">
              {current.message}
            </a>
          )
        ) : (
          current.message
        )}
      </div>
      {count > 1 && (
        <button
          type="button"
          className={styles.announcementArrow}
          aria-label="Next message"
          onClick={() => setIndex((index + 1) % count)}
        >
          ›
        </button>
      )}
    </div>
  );
}
