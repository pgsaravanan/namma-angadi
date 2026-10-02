import styles from "./Stars.module.scss";

export function Stars({ value, count, small }: { value: number; count?: number; small?: boolean }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span className={small ? `${styles.stars} ${styles.small}` : styles.stars} aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className={styles.row} aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={rounded >= star ? styles.full : rounded >= star - 0.5 ? `${styles.star} ${styles.half}` : styles.star}
          >
            ★
          </span>
        ))}
      </span>
      {count !== undefined && <span className={styles.count}>({count})</span>}
    </span>
  );
}
