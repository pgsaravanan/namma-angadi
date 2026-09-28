import { CartView } from "@/components/store/CartView";
import { parsePaymentMethods } from "@/lib/payment-methods";
import { getShopPaymentConfig } from "@/lib/payments";
import { requireShop } from "@/lib/tenant";
import styles from "../store.module.scss";

export const metadata = { title: "Your bag" };

export default async function CartPage({ searchParams }: PageProps<"/s/[shop]/cart">) {
  const shop = await requireShop();
  const { payment } = await searchParams;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your bag</h1>
      <CartView
        shopId={shop.id}
        shopName={shop.name}
        methods={parsePaymentMethods(shop.paymentMethods)}
        acceptsPayments={getShopPaymentConfig(shop) !== null}
        paymentNotice={typeof payment === "string" ? payment : undefined}
      />
    </div>
  );
}
