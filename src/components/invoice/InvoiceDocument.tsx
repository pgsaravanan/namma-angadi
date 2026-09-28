import type { Order, OrderItem, Shop } from "@/generated/prisma/client";
import { addressLines, formatIndianMobile } from "@/lib/india";
import { buildInvoice } from "@/lib/invoice";
import { formatPaise } from "@/lib/money";
import styles from "./Invoice.module.scss";
import { PrintButton } from "./PrintButton";

type Props = { order: Order & { items: OrderItem[] }; shop: Shop; backHref: string };

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

export function InvoiceDocument({ order, shop, backHref }: Props) {
  const invoice = buildInvoice(order, shop);
  const sellerName = shop.legalName ?? shop.name;
  const taxColumns = invoice.gstRegistered;

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <a href={backHref}>← Back</a>
        <PrintButton />
      </div>

      <article className={styles.sheet}>
        <header className={styles.header}>
          <div>
            {shop.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logoUrl} alt="" className={styles.logo} />
            )}
            <h1 className={styles.seller}>{sellerName}</h1>
            {shop.address && <p>{shop.address}</p>}
            {shop.supportPhone && <p>Phone: {formatIndianMobile(shop.supportPhone)}</p>}
            {shop.supportEmail && <p>Email: {shop.supportEmail}</p>}
            {order.sellerGstin && <p>GSTIN: {order.sellerGstin}</p>}
            {shop.fssaiNumber && <p>FSSAI Lic. No: {shop.fssaiNumber}</p>}
          </div>
          <div className={styles.meta}>
            <h2>{invoice.title}</h2>
            <dl>
              <dt>Invoice no.</dt>
              <dd>{invoice.number ?? "—"}</dd>
              <dt>Date</dt>
              <dd>{order.paidAt ? dateFormat.format(order.paidAt) : "—"}</dd>
              <dt>Order no.</dt>
              <dd>#{order.number}</dd>
              {taxColumns && (
                <>
                  <dt>Place of supply</dt>
                  <dd>{order.deliveryMethod === "pickup" ? (shop.shopState ?? "—") : order.state || "—"}</dd>
                </>
              )}
            </dl>
          </div>
        </header>

        <section className={styles.buyer}>
          <h3>Bill to</h3>
          <p>
            <strong>{order.customerName}</strong>
          </p>
          <p>{formatIndianMobile(order.customerPhone)}</p>
          {order.customerEmail && <p>{order.customerEmail}</p>}
          {order.deliveryMethod === "pickup" ? (
            <p>Pickup from the shop</p>
          ) : (
            addressLines(order).map((line) => <p key={line}>{line}</p>)
          )}
        </section>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              {taxColumns && <th>HSN</th>}
              <th className={styles.num}>Qty</th>
              <th className={styles.num}>Amount</th>
              {order.discountPaise > 0 && <th className={styles.num}>Discount</th>}
              {taxColumns && <th className={styles.num}>Taxable</th>}
              {taxColumns && !invoice.interState && <th className={styles.num}>CGST</th>}
              {taxColumns && !invoice.interState && <th className={styles.num}>SGST</th>}
              {taxColumns && invoice.interState && <th className={styles.num}>IGST</th>}
              <th className={styles.num}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr key={`${line.description}-${index}`}>
                <td>{index + 1}</td>
                <td>{line.description}</td>
                {taxColumns && <td>{line.hsnCode ?? "—"}</td>}
                <td className={styles.num}>{line.quantity}</td>
                <td className={styles.num}>{formatPaise(line.grossPaise)}</td>
                {order.discountPaise > 0 && (
                  <td className={styles.num}>{line.discountPaise ? `− ${formatPaise(line.discountPaise)}` : "—"}</td>
                )}
                {taxColumns && <td className={styles.num}>{formatPaise(line.taxablePaise)}</td>}
                {taxColumns && !invoice.interState && (
                  <td className={styles.num}>
                    {formatPaise(line.cgstPaise)}
                    <small> @{line.rate / 2}%</small>
                  </td>
                )}
                {taxColumns && !invoice.interState && (
                  <td className={styles.num}>
                    {formatPaise(line.sgstPaise)}
                    <small> @{line.rate / 2}%</small>
                  </td>
                )}
                {taxColumns && invoice.interState && (
                  <td className={styles.num}>
                    {formatPaise(line.igstPaise)}
                    <small> @{line.rate}%</small>
                  </td>
                )}
                <td className={styles.num}>{formatPaise(line.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.summary}>
          <p className={styles.words}>
            <strong>Amount in words:</strong> {invoice.amountInWords}
          </p>
          <dl>
            {taxColumns && (
              <>
                <dt>Taxable value</dt>
                <dd>{formatPaise(invoice.totals.taxable)}</dd>
                {invoice.interState ? (
                  <>
                    <dt>IGST</dt>
                    <dd>{formatPaise(invoice.totals.igst)}</dd>
                  </>
                ) : (
                  <>
                    <dt>CGST</dt>
                    <dd>{formatPaise(invoice.totals.cgst)}</dd>
                    <dt>SGST</dt>
                    <dd>{formatPaise(invoice.totals.sgst)}</dd>
                  </>
                )}
              </>
            )}
            <dt className={styles.grand}>Total paid</dt>
            <dd className={styles.grand}>{formatPaise(invoice.totals.grand)}</dd>
          </dl>
        </div>

        <footer className={styles.footer}>
          {taxColumns ? (
            <p>Prices include GST. This is a computer-generated invoice and does not need a signature.</p>
          ) : (
            <p>The seller is not registered under GST, so no tax is charged. This is a computer-generated bill.</p>
          )}
          <p>Paid online by UPI. Thank you for your order!</p>
        </footer>
      </article>
    </main>
  );
}
