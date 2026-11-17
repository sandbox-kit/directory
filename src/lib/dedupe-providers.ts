import { displayDomain } from "@/lib/domain";
import type { SandboxProvider } from "@/types/provider";

/** First path segment(s) scope uniqueness for multi-product doc sites. */
const DOC_HOST_SCOPE_DEPTH: Record<string, number> = {
  "docs.aws.amazon.com": 1,
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

function entryRank(provider: SandboxProvider): number {
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

/** One row per host; keeps the strongest curated row if duplicates slip in. */
export function dedupeProvidersByHost(
  list: SandboxProvider[],
): SandboxProvider[] {
  const byHost = new Map<string, SandboxProvider>();

  for (const provider of list) {
    const key = providerHostKey(provider);
    if (!key) continue;
    const prev = byHost.get(key);
    if (!prev || entryRank(provider) > entryRank(prev)) {
      byHost.set(key, provider);
    }
  }

  const slugs = new Set<string>();
  const out: SandboxProvider[] = [];
  for (const provider of byHost.values()) {
    const slug = provider.slug.toLowerCase();
    if (slugs.has(slug)) continue;
    slugs.add(slug);
    out.push(provider);
  }

  return out;
}
