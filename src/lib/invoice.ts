import type { Order, OrderItem, Shop } from "@/generated/prisma/client";

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(value: number) {
  return value < 20 ? ONES[value] : `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${ONES[value % 10]}` : ""}`;
}

function belowThousand(value: number) {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

export function rupeesInWords(paise: number) {
  const rupees = Math.floor(paise / 100);
  const remainingPaise = paise % 100;
  if (rupees === 0 && remainingPaise === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  const crore = Math.floor(rupees / 1_00_00_000);
  const lakh = Math.floor((rupees % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((rupees % 1_00_000) / 1000);
  const rest = rupees % 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));

  const rupeeText = rupees ? `${parts.join(" ")} Rupees` : "";
  const paiseText = remainingPaise ? `${belowHundred(remainingPaise)} Paise` : "";
  return `${[rupeeText, paiseText].filter(Boolean).join(" and ")} Only`;
}

export function financialYear(date: Date) {
  const india = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const year = india.getUTCMonth() >= 3 ? india.getUTCFullYear() : india.getUTCFullYear() - 1;
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}

export function invoiceNumberText(order: Pick<Order, "invoiceNumber" | "paidAt">) {
  if (!order.invoiceNumber || !order.paidAt) return null;
  return `INV/${financialYear(order.paidAt)}/${String(order.invoiceNumber).padStart(4, "0")}`;
}

export type InvoiceLine = {
  description: string;
  hsnCode: string | null;
  quantity: number;
  grossPaise: number;
  discountPaise: number;
  taxablePaise: number;
  rate: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
};

type InvoiceOrder = Pick<
  Order,
  "discountPaise" | "deliveryFeePaise" | "totalPaise" | "state" | "deliveryMethod" | "sellerGstin" | "invoiceNumber" | "paidAt"
> & { items: Pick<OrderItem, "name" | "hsnCode" | "quantity" | "unitPricePaise" | "gstRate">[] };

type InvoiceShop = Pick<Shop, "shopState" | "defaultGstRate">;

function splitTax(netPaise: number, rate: number, interState: boolean, gstRegistered: boolean) {
  if (!gstRegistered || rate === 0) return { taxable: netPaise, cgst: 0, sgst: 0, igst: 0 };
  const taxable = Math.round((netPaise * 100) / (100 + rate));
  const tax = netPaise - taxable;
  if (interState) return { taxable, cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.floor(tax / 2);
  return { taxable, cgst, sgst: tax - cgst, igst: 0 };
}

export function buildInvoice(order: InvoiceOrder, shop: InvoiceShop) {
  const gstRegistered = Boolean(order.sellerGstin);
  const interState =
    order.deliveryMethod === "delivery" && Boolean(order.state && shop.shopState) && order.state !== shop.shopState;

  const gross = order.items.map((item) => item.unitPricePaise * item.quantity);
  const itemsTotal = gross.reduce((sum, value) => sum + value, 0);
  let discountLeft = order.discountPaise;

  const lines: InvoiceLine[] = order.items.map((item, index) => {
    const isLast = index === order.items.length - 1;
    const discount = isLast
      ? discountLeft
      : itemsTotal
        ? Math.round((order.discountPaise * gross[index]) / itemsTotal)
        : 0;
    discountLeft -= discount;
    const net = gross[index] - discount;
    const tax = splitTax(net, item.gstRate, interState, gstRegistered);
    return {
      description: item.name,
      hsnCode: item.hsnCode,
      quantity: item.quantity,
      grossPaise: gross[index],
      discountPaise: discount,
      taxablePaise: tax.taxable,
      rate: gstRegistered ? item.gstRate : 0,
      cgstPaise: tax.cgst,
      sgstPaise: tax.sgst,
      igstPaise: tax.igst,
      totalPaise: net,
    };
  });

  if (order.deliveryFeePaise > 0) {
    const tax = splitTax(order.deliveryFeePaise, shop.defaultGstRate, interState, gstRegistered);
    lines.push({
      description: "Delivery charges",
      hsnCode: null,
      quantity: 1,
      grossPaise: order.deliveryFeePaise,
      discountPaise: 0,
      taxablePaise: tax.taxable,
      rate: gstRegistered ? shop.defaultGstRate : 0,
      cgstPaise: tax.cgst,
      sgstPaise: tax.sgst,
      igstPaise: tax.igst,
      totalPaise: order.deliveryFeePaise,
    });
  }

  const sum = (key: keyof InvoiceLine) => lines.reduce((total, line) => total + (line[key] as number), 0);

  return {
    title: gstRegistered ? "Tax Invoice" : "Bill of Supply",
    number: invoiceNumberText(order),
    gstRegistered,
    interState,
    lines,
    totals: {
      taxable: sum("taxablePaise"),
      cgst: sum("cgstPaise"),
      sgst: sum("sgstPaise"),
      igst: sum("igstPaise"),
      discount: order.discountPaise,
      grand: order.totalPaise,
    },
    amountInWords: rupeesInWords(order.totalPaise),
  };
}
