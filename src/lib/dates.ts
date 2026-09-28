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
