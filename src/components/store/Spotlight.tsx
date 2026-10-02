import { PROMOTION_KINDS, isPromotionKind } from "@/lib/promotions";
import { ProductCard, type CardProduct } from "./ProductCard";
import { AutoScrollTrack, Countdown, CopyCode, Reveal } from "./SpotlightParts";
import styles from "./Spotlight.module.scss";
import { FramedMedia } from "./FramedMedia";

export type SpotlightPromotion = {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  mediaUrl: string | null;
  endsAt: Date | null;
  couponCode: string | null;
  products: CardProduct[];
};

export function Spotlight({ promotion }: { promotion: SpotlightPromotion }) {
  const kind = isPromotionKind(promotion.kind) ? promotion.kind : "launch";

  return (
    <Reveal className={`${styles.spotlight} ${styles[kind]}`}>
      <div className={styles.intro}>
        <span className={styles.badge}>
          <span aria-hidden>✦</span> {PROMOTION_KINDS[kind]}
        </span>
        <h2 className={styles.title}>{promotion.title}</h2>
        {promotion.subtitle && <p className={styles.subtitle}>{promotion.subtitle}</p>}
        <div className={styles.extras}>
          {promotion.couponCode && <CopyCode code={promotion.couponCode} />}
          {promotion.endsAt && <Countdown endsAt={promotion.endsAt.toISOString()} />}
        </div>
        {promotion.mediaUrl && <FramedMedia url={promotion.mediaUrl} className={styles.media} />}
      </div>
      <AutoScrollTrack className={styles.track}>
        {promotion.products.map((product) => (
          <div key={product.id} className={styles.item}>
            <ProductCard product={product} />
          </div>
        ))}
      </AutoScrollTrack>
    </Reveal>
  );
}
