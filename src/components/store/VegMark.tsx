import styles from "./VegMark.module.scss";

const LABELS: Record<string, string> = { veg: "Vegetarian", nonveg: "Non-vegetarian", egg: "Contains egg" };

export function VegMark({ type }: { type: string | null }) {
  if (!type || !LABELS[type]) return null;
  return (
    <span className={`${styles.mark} ${styles[type]}`} role="img" aria-label={LABELS[type]} title={LABELS[type]}>
      <span className={styles.symbol} />
    </span>
  );
}
