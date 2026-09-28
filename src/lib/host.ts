export type HostTarget = { kind: "platform" } | { kind: "shop"; key: string };

const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api", "app", "platform", "mail", "static"]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function isValidSlug(slug: string) {
  return SLUG_PATTERN.test(slug) && !RESERVED_SUBDOMAINS.has(slug);
}

export function resolveHost(rawHost: string, rootDomain: string): HostTarget {
  const host = rawHost.trim().toLowerCase();
  const root = rootDomain.toLowerCase();

  if (host === root || host === `www.${root}`) return { kind: "platform" };

  if (host.endsWith(`.${root}`)) {
    const subdomain = host.slice(0, -(root.length + 1));
    return isValidSlug(subdomain) ? { kind: "shop", key: subdomain } : { kind: "platform" };
  }

  return { kind: "shop", key: host.split(":")[0] };
}

export function shopBaseUrl(slug: string, rootDomain: string, customDomain?: string | null) {
  if (customDomain) return `https://${customDomain}`;
  const protocol = rootDomain.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${slug}.${rootDomain}`;
}
