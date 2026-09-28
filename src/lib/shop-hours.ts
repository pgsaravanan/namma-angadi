import type { Shop } from "@/generated/prisma/client";

export const WEEK_DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
] as const;

const DAY_INDEX = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type HoursShop = Pick<Shop, "isAcceptingOrders" | "openTime" | "closeTime" | "openDays">;

export type ShopAvailability = { open: true } | { open: false; message: string };

function indiaClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: get("weekday").toLowerCase().slice(0, 3), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return minutes ? `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}` : `${hour12} ${suffix}`;
}

export function isValidTime(value: string) {
  return TIME_PATTERN.test(value);
}

export function openingHoursText(shop: HoursShop) {
  if (!shop.openTime || !shop.closeTime) return null;
  const days = shop.openDays.split(",").filter(Boolean);
  const dayText =
    days.length === 7 ? "Every day" : WEEK_DAYS.filter((day) => days.includes(day.id)).map((day) => day.label).join(", ");
  return `${dayText}, ${formatTime(shop.openTime)} – ${formatTime(shop.closeTime)}`;
}

export function shopAvailability(shop: HoursShop, now = new Date()): ShopAvailability {
  if (!shop.isAcceptingOrders) return { open: false, message: "We're not taking orders right now. Please check back soon." };
  if (!shop.openTime || !shop.closeTime) return { open: true };

  const days = shop.openDays.split(",").filter(Boolean);
  const { day, minutes } = indiaClock(now);
  const opens = toMinutes(shop.openTime);
  const closes = toMinutes(shop.closeTime);
  const openToday = days.includes(day);

  if (openToday && minutes >= opens && minutes < closes) return { open: true };

  const opensLaterToday = openToday && minutes < opens;
  if (opensLaterToday) return { open: false, message: `We're closed now. We open today at ${formatTime(shop.openTime)}.` };

  const todayIndex = DAY_INDEX.indexOf(day);
  for (let offset = 1; offset <= 7; offset++) {
    const next = DAY_INDEX[(todayIndex + offset) % 7];
    if (days.includes(next)) {
      const when = offset === 1 ? "tomorrow" : `on ${WEEK_DAYS.find((entry) => entry.id === next)?.label}`;
      return { open: false, message: `We're closed now. We open ${when} at ${formatTime(shop.openTime)}.` };
    }
  }
  return { open: false, message: "We're closed now." };
}
