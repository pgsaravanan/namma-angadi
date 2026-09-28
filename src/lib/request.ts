import "server-only";

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function sweep(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(key);
}

export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

export function clientIpFrom(headers: Headers) {
  const trusted = process.env.TRUST_PROXY_HEADERS === "true" || process.env.VERCEL === "1";
  if (!trusted) return "direct";
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function clientIp(request: Request) {
  return clientIpFrom(request.headers);
}

export function originFromHeaders(headers: Headers) {
  const host = headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

export function requestOrigin(request: Request) {
  return originFromHeaders(request.headers);
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
