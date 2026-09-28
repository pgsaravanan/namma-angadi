export const PAYMENT_METHODS = [
  { id: "upi", label: "UPI (PhonePe, Google Pay, Paytm, BHIM)" },
  { id: "card", label: "Debit and credit cards" },
  { id: "netbanking", label: "Netbanking" },
  { id: "wallet", label: "Wallets" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

const KNOWN = new Set<string>(PAYMENT_METHODS.map((method) => method.id));

export function parsePaymentMethods(value: string): PaymentMethod[] {
  const methods = value.split(",").filter((method): method is PaymentMethod => KNOWN.has(method));
  return methods.length ? methods : ["upi"];
}
