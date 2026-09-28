import { CartView } from "@/components/store/CartView";
import { getCustomerAccount } from "@/lib/customer-auth";
import { parsePaymentMethods } from "@/lib/payment-methods";
import { getShopPaymentConfig } from "@/lib/payments";
import { requireShop } from "@/lib/tenant";
import styles from "../store.module.scss";

export const metadata = { title: "Your bag" };

export default async function CartPage({ searchParams }: PageProps<"/s/[shop]/cart">) {
  const shop = await requireShop();
  const { payment } = await searchParams;
  const account = await getCustomerAccount(shop.id);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your bag</h1>
      <CartView
        shopId={shop.id}
        shopName={shop.name}
        methods={parsePaymentMethods(shop.paymentMethods)}
        acceptsPayments={getShopPaymentConfig(shop) !== null}
        paymentNotice={typeof payment === "string" ? payment : undefined}
        fulfilment={{
          deliveryEnabled: shop.deliveryEnabled,
          pickupEnabled: shop.pickupEnabled,
          pickupAddress: shop.address,
          deliveryNote: shop.deliveryNote,
        }}
        account={
          account && {
            name: account.name,
            phone: account.phone,
            email: account.email,
            line1: account.addressLine1 ?? "",
            line2: account.addressLine2 ?? "",
            city: account.city ?? "",
            state: account.state ?? "",
            pincode: account.pincode ?? "",
          }
        }
      />
    </div>
  );
}
