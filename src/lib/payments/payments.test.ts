import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../crypto";
import { isValidCheckoutSignature, razorpay } from "./razorpay";
import { isValidStripeSignature, stripe } from "./stripe";
import { signReturnPayload, testpay } from "./testpay";

const secret = "test_secret_value";

describe("razorpay checkout signature", () => {
  const signature = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");

  it("accepts the signature for the same order and payment", () => {
    expect(isValidCheckoutSignature("order_1", "pay_1", signature, secret)).toBe(true);
  });

  it("rejects a signature for a different payment or secret", () => {
    expect(isValidCheckoutSignature("order_1", "pay_2", signature, secret)).toBe(false);
    expect(isValidCheckoutSignature("order_1", "pay_1", signature, "other")).toBe(false);
    expect(isValidCheckoutSignature("order_1", "pay_1", "short", secret)).toBe(false);
  });
});

describe("razorpay webhook", () => {
  const config = { shopId: "shop_1", provider: "razorpay" as const, credentials: { webhookSecret: secret } };
  const body = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: { id: "pay_1", order_id: "order_1", amount: 5000, currency: "INR", status: "captured", method: "upi" },
      },
    },
  });
  const headersFor = (signature: string) =>
    new Headers({ "x-razorpay-signature": signature, "x-razorpay-event-id": "evt_1" });

  it("parses a correctly signed capture event", () => {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(razorpay.parseWebhook(config, body, headersFor(signature))).toMatchObject({
      id: "evt_1",
      type: "payment.captured",
      payment: { id: "pay_1", providerOrderId: "order_1", amountPaise: 5000, method: "upi" },
    });
  });

  it("rejects a tampered body or a missing webhook secret", () => {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(razorpay.parseWebhook(config, `${body} `, headersFor(signature))).toBeNull();
    expect(razorpay.parseWebhook({ ...config, credentials: {} }, body, headersFor(signature))).toBeNull();
  });
});

describe("upi simulator", () => {
  const config = { shopId: "shop_1", provider: "testpay" as const, credentials: {} };
  const payment = { orderId: "tp_order_1", paymentId: "tp_pay_1", amountPaise: 12345, method: "upi" };

  it("confirms a payment it signed", async () => {
    const payload = signReturnPayload(config, payment);
    await expect(testpay.confirmClientPayment(config, payload)).resolves.toMatchObject({
      providerOrderId: "tp_order_1",
      amountPaise: 12345,
      status: "captured",
    });
  });

  it("rejects a changed amount or a payment signed for another shop", async () => {
    const payload = signReturnPayload(config, payment);
    await expect(testpay.confirmClientPayment(config, { ...payload, amount: "100" })).rejects.toThrow();
    await expect(testpay.confirmClientPayment({ ...config, shopId: "shop_2" }, payload)).rejects.toThrow();
  });
});

describe("stripe webhook", () => {
  const whsec = "whsec_test_secret";
  const config = { shopId: "shop_1", provider: "stripe" as const, credentials: { secretKey: "sk_test_x", webhookSecret: whsec } };
  const body = JSON.stringify({
    id: "evt_1",
    type: "checkout.session.completed",
    data: {
      object: { id: "cs_test_1", amount_total: 5000, currency: "inr", payment_status: "paid", payment_intent: "pi_1" },
    },
  });
  const now = Date.UTC(2026, 8, 28, 12, 0, 0);
  const signatureAt = (timestamp: number) =>
    `t=${timestamp},v1=${createHmac("sha256", whsec).update(`${timestamp}.${body}`).digest("hex")}`;

  it("accepts a fresh signature and maps the completed session to a captured payment", () => {
    const header = signatureAt(Math.floor(Date.now() / 1000));
    expect(stripe.parseWebhook(config, body, new Headers({ "stripe-signature": header }))).toMatchObject({
      id: "evt_1",
      type: "payment.captured",
      payment: { id: "pi_1", providerOrderId: "cs_test_1", amountPaise: 5000, currency: "INR" },
    });
  });

  it("rejects old timestamps and wrong secrets", () => {
    expect(isValidStripeSignature(body, signatureAt(now / 1000 - 600), whsec, now)).toBe(false);
    expect(isValidStripeSignature(body, signatureAt(now / 1000), "whsec_other", now)).toBe(false);
    expect(isValidStripeSignature(body, signatureAt(now / 1000), whsec, now)).toBe(true);
  });
});

describe("secret encryption", () => {
  it("round-trips and produces different ciphertext each time", () => {
    const first = encryptSecret("rzp_secret");
    expect(decryptSecret(first)).toBe("rzp_secret");
    expect(encryptSecret("rzp_secret")).not.toBe(first);
  });

  it("fails if the stored value is tampered with", () => {
    const [iv, tag, data] = encryptSecret("rzp_secret").split(".");
    const tampered = [iv, tag, Buffer.from("x" + data).toString("base64")].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
