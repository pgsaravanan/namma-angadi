import "server-only";
import { after } from "next/server";
import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "./db";
import { sendEmail } from "./email";
import { env } from "./env";
import { shopBaseUrl } from "./host";
import { addressLines } from "./india";
import { formatPaise } from "./money";
import { statusLabel } from "./order-status";

function runLater(task: () => Promise<void>) {
  const guarded = () => task().catch((error) => console.error("Notification failed", error));
  try {
    after(guarded);
  } catch {
    void guarded();
  }
}

async function loadOrder(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      shop: { include: { members: { where: { role: "SUPER_ADMIN" }, include: { user: true } } } },
    },
  });
}

type LoadedOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

function itemLines(order: LoadedOrder) {
  return order.items.map((item) => `• ${item.name} × ${item.quantity} = ${formatPaise(item.unitPricePaise * item.quantity)}`);
}

function deliveryText(order: LoadedOrder) {
  return order.deliveryMethod === "pickup"
    ? `Pickup from the shop${order.shop.address ? ` (${order.shop.address})` : ""}`
    : addressLines(order).join(", ");
}

function shopRecipients(order: LoadedOrder) {
  const configured = order.shop.notifyEmail ?? order.shop.supportEmail;
  if (configured) return [configured];
  return order.shop.members.map((member) => member.user.email);
}

export function notifyOrderPaid(orderId: string) {
  runLater(async () => {
    const order = await loadOrder(orderId);
    if (!order) return;
    const base = shopBaseUrl(order.shop.slug, env.rootDomain, order.shop.customDomain);

    for (const to of shopRecipients(order)) {
      await sendEmail({
        shopId: order.shopId,
        to,
        subject: `New order #${order.number} · ${formatPaise(order.totalPaise)} · ${order.customerName}`,
        replyTo: order.customerEmail,
        text: [
          `You have a new paid order on ${order.shop.name}.`,
          "",
          ...itemLines(order),
          order.deliveryFeePaise ? `Delivery: ${formatPaise(order.deliveryFeePaise)}` : "",
          `Total paid: ${formatPaise(order.totalPaise)}`,
          "",
          `Customer: ${order.customerName}, ${order.customerPhone}`,
          `${order.deliveryMethod === "pickup" ? "Pickup" : "Deliver to"}: ${deliveryText(order)}`,
          "",
          `Open the order: ${base}/admin/orders/${order.id}`,
        ]
          .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
          .join("\n"),
      });
    }

    if (order.customerEmail) {
      await sendEmail({
        shopId: order.shopId,
        to: order.customerEmail,
        subject: `Your ${order.shop.name} order #${order.number} is confirmed`,
        replyTo: order.shop.supportEmail,
        text: [
          `Hi ${order.customerName.split(" ")[0]},`,
          "",
          `Thank you! We've received your payment of ${formatPaise(order.totalPaise)}.`,
          "",
          ...itemLines(order),
          "",
          `${order.deliveryMethod === "pickup" ? "Pickup" : "Delivering to"}: ${deliveryText(order)}`,
          "",
          `Track your order: ${base}/orders/${order.accessToken}`,
          `Your bill: ${base}/bill/${order.accessToken}`,
          "",
          `${order.shop.contactName ?? order.shop.name}${order.shop.supportPhone ? ` · +91 ${order.shop.supportPhone}` : ""}`,
        ].join("\n"),
      });
    }
  });
}

export function notifyStatusChange(orderId: string, status: OrderStatus) {
  runLater(async () => {
    const order = await loadOrder(orderId);
    if (!order?.customerEmail) return;
    const base = shopBaseUrl(order.shop.slug, env.rootDomain, order.shop.customDomain);
    const label = statusLabel(status, order.deliveryMethod);

    await sendEmail({
      shopId: order.shopId,
      to: order.customerEmail,
      subject: `Order #${order.number}: ${label}`,
      replyTo: order.shop.supportEmail,
      text: [
        `Hi ${order.customerName.split(" ")[0]},`,
        "",
        `Your ${order.shop.name} order #${order.number} is now: ${label}.`,
        "",
        `Track your order: ${base}/orders/${order.accessToken}`,
      ].join("\n"),
    });
  });
}
