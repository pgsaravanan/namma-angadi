const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function formatPaise(paise: number) {
  return formatter.format(paise / 100);
}

export function rupeesToPaise(rupees: string | number) {
  const value = typeof rupees === "number" ? rupees : Number(rupees);
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid amount");
  return Math.round(value * 100);
}

export function paiseToRupees(paise: number) {
  return (paise / 100).toFixed(2);
}
