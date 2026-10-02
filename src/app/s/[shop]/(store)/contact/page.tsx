import { ContactForm } from "@/components/store/ContactForm";
import ui from "@/components/ui/ui.module.scss";
import { formatIndianMobile } from "@/lib/india";
import { openingHoursText } from "@/lib/shop-hours";
import { requireShop } from "@/lib/tenant";
import styles from "../store.module.scss";
import { sendContactMessage } from "./actions";

export const metadata = { title: "Contact us" };

export default async function ContactPage() {
  const shop = await requireShop();
  const whatsapp = shop.whatsappNumber || shop.supportPhone;
  const hours = openingHoursText(shop);

  return (
    <div className={`${styles.container} ${styles.contactLayout}`}>
      <div className={styles.contactIntro}>
        <h1 className={styles.title}>Contact us</h1>
        <p className={ui.muted}>
          Questions about an order, a bulk or function order, or anything else? Send us a message and{" "}
          {shop.contactName ?? "we"} will get back to you.
        </p>
        <div className={styles.contactWays}>
          {whatsapp && (
            <a
              href={`https://wa.me/91${whatsapp}?text=${encodeURIComponent(`Hi ${shop.name}, I have a question.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ui.button} ${styles.whatsappLink}`}
            >
              WhatsApp us
            </a>
          )}
          {shop.supportPhone && (
            <a href={`tel:+91${shop.supportPhone}`} className={`${ui.button} ${ui.secondary}`}>
              Call {formatIndianMobile(shop.supportPhone)}
            </a>
          )}
          {shop.supportEmail && (
            <a href={`mailto:${shop.supportEmail}`} className={`${ui.button} ${ui.secondary}`}>
              Email us
            </a>
          )}
        </div>
        {(shop.address || hours) && (
          <dl className={styles.contactDetails}>
            {shop.address && (
              <>
                <dt>Address</dt>
                <dd>{shop.address}</dd>
              </>
            )}
            {hours && (
              <>
                <dt>Opening hours</dt>
                <dd>{hours}</dd>
              </>
            )}
          </dl>
        )}
      </div>
      <section className={ui.card}>
        <h2 className={styles.cardTitle}>Send us a message</h2>
        <ContactForm action={sendContactMessage} />
      </section>
    </div>
  );
}
