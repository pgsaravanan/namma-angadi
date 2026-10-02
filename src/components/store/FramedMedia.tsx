import { isVideoUrl } from "@/lib/media";
import styles from "./FramedMedia.module.scss";

export type MediaPlaceholder = { logoUrl: string | null; name: string };

export function FramedMedia({
  url,
  className,
  alt = "",
  fit = "contain",
  placeholder,
}: {
  url: string | null;
  className?: string;
  alt?: string;
  fit?: "contain" | "cover";
  placeholder?: MediaPlaceholder;
}) {
  const frame = className ? `${styles.frame} ${className}` : styles.frame;

  if (!url) {
    return (
      <div className={`${frame} ${styles.placeholder}`} aria-hidden>
        {placeholder?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={placeholder.logoUrl} alt="" className={styles.logo} loading="lazy" />
        ) : (
          <span className={styles.initial}>{placeholder?.name.charAt(0) ?? ""}</span>
        )}
      </div>
    );
  }

  if (isVideoUrl(url)) {
    return (
      <div className={frame}>
        <video src={url} className={styles.cover} muted loop autoPlay playsInline preload="metadata" aria-label={alt || undefined} />
      </div>
    );
  }

  return (
    <div className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className={fit === "cover" ? styles.cover : styles.contain} loading="lazy" />
    </div>
  );
}
