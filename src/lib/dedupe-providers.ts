import { displayDomain } from "@/lib/domain";
import type { SandboxProvider } from "@/types/provider";

/** First path segment(s) scope uniqueness for multi-product doc sites. */
const DOC_HOST_SCOPE_DEPTH: Record<string, number> = {
  "docs.aws.amazon.com": 1,
  /** One row per org/repo (OSS sandboxes). */
  "github.com": 2,
};

function scopedHostKey(url: string, host: string): string {
  const depth = DOC_HOST_SCOPE_DEPTH[host];
  if (depth === undefined) return host;
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length === 0) return host;
    const scope = parts.slice(0, depth).join("/").toLowerCase();
    return `${host}/${scope}`;
  } catch {
    return host;
  }
}

/** Host key after redirects (product-scoped for shared doc domains). */
export function providerHostKey(provider: SandboxProvider): string {
  const final = provider.website_check?.final_url;
  const url =
    typeof final === "string" && final.startsWith("http")
      ? final
      : provider.website;
  const host = displayDomain(url);
  return scopedHostKey(url, host);
}

/** Registrable domain for vendor-level dedupe (e.g. developers.x.com → x.com). */
export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, "");
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  return parts.slice(-2).join(".");
}

/** Stable label for matching the same vendor under different subdomains. */
export function normalizeVendorLabel(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(sandbox|sandboxes|platform)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 48);
}

/**
 * Vendor identity for dedupe when host keys differ (e.g. cloudflare.com vs developers.cloudflare.com).
 * Returns null for scoped hosts (GitHub repos, AWS product docs) where each host key is intentional.
 */
export function providerVendorKey(provider: SandboxProvider): string | null {
  const hostKey = providerHostKey(provider);
  if (!hostKey || hostKey.includes("/")) return null;

  const host = hostKey.split("/")[0] ?? hostKey;
  if (host === "docs.aws.amazon.com" || host === "github.com") return null;

  const domain = registrableDomain(host);
  const label = normalizeVendorLabel(provider.display_name ?? provider.name);
  if (!domain || !label) return null;
  return `${domain}|${label}`;
}

export function providerRowRank(provider: SandboxProvider): number {
  const status = provider.website_status ?? "";
  const statusScore =
    status === "ok"
      ? 4
      : status === "redirect"
        ? 3
        : status === "blocked"
          ? 2
          : 0;
  const profile = provider.profile ? 10 : 0;
  const sources = provider.sources?.length ?? 0;
  return profile * 1000 + statusScore * 10 + sources;
}

function unionSources(a: SandboxProvider, b: SandboxProvider): SandboxProvider {
  const keep = providerRowRank(a) >= providerRowRank(b) ? a : b;
  const drop = keep === a ? b : a;
  const sources = new Set([...(keep.sources ?? []), ...(drop.sources ?? [])]);
  return { ...keep, sources: [...sources] };
}

/** One row per host key; merges weaker duplicates instead of dropping their sources. */
export function dedupeProvidersByHost(
  list: SandboxProvider[],
): SandboxProvider[] {
  const byHost = new Map<string, SandboxProvider>();

  for (const provider of list) {
    const key = providerHostKey(provider);
    if (!key) continue;
    const prev = byHost.get(key);
    byHost.set(key, prev ? unionSources(prev, provider) : provider);
  }

  return dedupeProvidersByVendorKey([...byHost.values()]);
}

/** Collapse same vendor on different subdomains (e.g. marketing site vs docs). */
export function dedupeProvidersByVendorKey(
  list: SandboxProvider[],
): SandboxProvider[] {
  const passthrough: SandboxProvider[] = [];
  const byVendor = new Map<string, SandboxProvider>();

  for (const provider of list) {
    const vendorKey = providerVendorKey(provider);
    if (!vendorKey) {
      passthrough.push(provider);
      continue;
    }
    const prev = byVendor.get(vendorKey);
    byVendor.set(vendorKey, prev ? unionSources(prev, provider) : provider);
  }

  const slugs = new Set<string>();
  const out: SandboxProvider[] = [];
  for (const provider of [...byVendor.values(), ...passthrough]) {
    const slug = provider.slug.toLowerCase();
    if (slugs.has(slug)) continue;
    slugs.add(slug);
    out.push(provider);
  }

  return out;
}

export type InventoryDuplicateReport = {
  duplicateSlugs: string[];
  duplicateHostKeys: string[];
  duplicateVendorKeys: string[];
};

/** Detect duplicate slugs or host keys remaining in an inventory snapshot. */
export function findInventoryDuplicates(
  list: SandboxProvider[],
): InventoryDuplicateReport {
  const slugToCount = new Map<string, number>();
  const hostToSlugs = new Map<string, string[]>();
  const vendorToSlugs = new Map<string, string[]>();

  for (const row of list) {
    const slug = row.slug.toLowerCase();
    slugToCount.set(slug, (slugToCount.get(slug) ?? 0) + 1);

    const hostKey = providerHostKey(row);
    if (hostKey) {
      const slugs = hostToSlugs.get(hostKey) ?? [];
      slugs.push(row.slug);
      hostToSlugs.set(hostKey, slugs);
    }

    const vendorKey = providerVendorKey(row);
    if (vendorKey) {
      const slugs = vendorToSlugs.get(vendorKey) ?? [];
      slugs.push(row.slug);
      vendorToSlugs.set(vendorKey, slugs);
    }
  }

  return {
    duplicateSlugs: [...slugToCount.entries()]
      .filter(([, count]) => count > 1)
      .map(([slug]) => slug),
    duplicateHostKeys: [...hostToSlugs.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([host]) => host),
    duplicateVendorKeys: [...vendorToSlugs.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([vendor]) => vendor),
  };
}
