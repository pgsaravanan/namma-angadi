type ReviewRequest = { shopName: string; customerName: string; phone: string; orderUrl: string };

export function reviewRequestWhatsAppUrl({ shopName, customerName, phone, orderUrl }: ReviewRequest) {
  const firstName = customerName.trim().split(/\s+/)[0];
  const text = `Hi ${firstName}, hope you enjoyed your order from ${shopName}! Could you rate it? It takes a minute and helps us a lot ⭐ ${orderUrl}#reviews`;
  return `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
}
