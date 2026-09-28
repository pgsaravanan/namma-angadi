import { notFound } from "next/navigation";
import { PaymentReturn } from "@/components/store/PaymentReturn";
import { requireShop } from "@/lib/tenant";
import styles from "../../store.module.scss";

export const metadata = { title: "Confirming payment", robots: { index: false } };

export default async function PaymentReturnPage({ searchParams }: PageProps<"/s/[shop]/checkout/return">) {
  const shop = await requireShop();
  const { provider, token, ...rest } = await searchParams;
  if (typeof provider !== "string" || typeof token !== "string") notFound();

  const payload = Object.fromEntries(
    Object.entries(rest).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  return (
    <div className={styles.container}>
      <PaymentReturn shopId={shop.id} provider={provider} token={token} payload={payload} />
    </div>
  );
}
