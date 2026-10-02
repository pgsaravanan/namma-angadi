import { isVideoUrl } from "@/lib/media";
import styles from "./FramedMedia.module.scss";

export function FramedMedia({
  url,
  className,
  alt = "",
  fit = "contain",
}: {
  url: string;
  className?: string;
  alt?: string;
  fit?: "contain" | "cover";
}) {
  const frame = className ? `${styles.frame} ${className}` : styles.frame;

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
