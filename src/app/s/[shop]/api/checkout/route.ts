import { AccountError, createCustomerSession, getCustomerAccount, registerCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { CheckoutError, checkoutSchema, createCheckout } from "@/lib/orders";
import { clientIp, isRateLimited, isSameOrigin, requestOrigin } from "@/lib/request";
import { getActiveShop } from "@/lib/tenant";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (isRateLimited(`checkout:${clientIp(request)}`, 10, 60_000)) {
    return Response.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  const shop = await getActiveShop();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Please check your details" }, { status: 400 });
  }
  const input = parsed.data;

  try {
    let account = await getCustomerAccount(shop.id);

    if (!account && input.createAccount) {
      if (!input.customer.email) throw new CheckoutError("Enter your email to create an account");
      account = await registerCustomer(shop.id, {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        password: input.createAccount.password,
        address: input.address,
      });
      await createCustomerSession(account.id);
    } else if (account && input.address) {
      await db.customerAccount.update({
        where: { id: account.id },
        data: {
          addressLine1: input.address.line1,
          addressLine2: input.address.line2 || null,
          city: input.address.city,
          state: input.address.state,
          pincode: input.address.pincode,
        },
      });
    }

    return Response.json(await createCheckout(shop, input, requestOrigin(request), account?.id ?? null));
  } catch (error) {
    if (error instanceof CheckoutError || error instanceof AccountError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Checkout failed", error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
