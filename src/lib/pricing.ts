import "server-only";
import { z } from "zod";
import { db } from "./db";
import { calculateDiscount } from "./discount";

export const cartLinesSchema = z
  .array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(20) }))
  .min(1)
  .max(50);

export type CartLineInput = z.infer<typeof cartLinesSchema>[number];

type Client = Pick<typeof db, "product" | "coupon">;

export type QuoteLine = {
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  stock: number;
};

export type Quote = {
  lines: QuoteLine[];
  problems: string[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  couponId: string | null;
  couponError: string | null;
};

function mergeLines(lines: CartLineInput[]) {
  const quantities = new Map<string, number>();
  for (const line of lines) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  return quantities;
}

export async function quoteCart(
  shopId: string,
  input: CartLineInput[],
  couponCode?: string | null,
  client: Client = db,
): Promise<Quote> {
  const quantities = mergeLines(input);
  const products = await client.product.findMany({
    where: { shopId, isActive: true, id: { in: [...quantities.keys()] } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const lines: QuoteLine[] = [];
  const problems: string[] = [];

  for (const [productId, quantity] of quantities) {
    const product = byId.get(productId);
    if (!product) {
      problems.push("An item in your cart is no longer available");
      continue;
    }
    if (product.stock < quantity) {
      problems.push(
        product.stock === 0 ? `${product.name} is out of stock` : `Only ${product.stock} of ${product.name} left`,
      );
    }
    lines.push({
      productId,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPricePaise: product.pricePaise,
      quantity,
      lineTotalPaise: product.pricePaise * quantity,
      stock: product.stock,
    });
  }

  const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  let discountPaise = 0;
  let couponId: string | null = null;
  let couponError: string | null = null;

  const code = couponCode?.trim().toUpperCase();
  if (code) {
    const coupon = await client.coupon.findUnique({ where: { shopId_code: { shopId, code } } });
    const result = coupon ? calculateDiscount(coupon, subtotalPaise) : { ok: false as const, error: "Invalid coupon code" };
    if (result.ok) {
      discountPaise = result.discountPaise;
      couponId = coupon!.id;
    } else {
      couponError = result.error;
    }
  }

  return {
    lines,
    problems,
    subtotalPaise,
    discountPaise,
    totalPaise: subtotalPaise - discountPaise,
    couponId,
    couponError,
  };
}
