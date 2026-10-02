export const INDIA_TIME_ZONE = "Asia/Kolkata";

export const indiaDate = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: INDIA_TIME_ZONE });

export const indiaDateTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: INDIA_TIME_ZONE,
});

export const indiaDateTimeSeconds = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: INDIA_TIME_ZONE,
});

export const indiaTime = new Intl.DateTimeFormat("en-IN", { timeStyle: "medium", timeZone: INDIA_TIME_ZONE });

const inputParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: INDIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function toIndiaInputValue(date: Date) {
  const part = Object.fromEntries(inputParts.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`;
}
