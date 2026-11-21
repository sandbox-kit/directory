import { z } from "zod";

export const providerDocLinkSchema = z.object({
  description: z.string().min(1),
  link: z.url(),
});

export type ProviderDocLink = z.infer<typeof providerDocLinkSchema>;

export function docLinkKey(link: string): string {
  try {
    const u = new URL(link);
    u.hash = "";
    return u.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return link.trim().toLowerCase();
  }
}

export function normalizeProviderDocs(
  raw: readonly { description?: string; link?: string }[] | undefined,
): ProviderDocLink[] {
  if (!raw?.length) return [];
  const out: ProviderDocLink[] = [];
  for (const item of raw) {
    const parsed = providerDocLinkSchema.safeParse({
      description: (item.description ?? "").trim(),
      link: (item.link ?? "").trim(),
    });
    if (parsed.success) out.push(parsed.data);
  }
  return mergeProviderDocs(out);
}

export function mergeProviderDocs(
  ...lists: ReadonlyArray<readonly ProviderDocLink[] | undefined>
): ProviderDocLink[] {
  const byKey = new Map<string, ProviderDocLink>();
  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      const key = docLinkKey(item.link);
      const prev = byKey.get(key);
      if (!prev || item.description.length > prev.description.length) {
        byKey.set(key, item);
      }
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.description.localeCompare(b.description),
  );
}

export function providerHasPricingDoc(
  docs: readonly ProviderDocLink[] | undefined,
): boolean {
  return (docs ?? []).some((d) =>
    /pricing|billing|plans|cost/i.test(`${d.description} ${d.link}`),
  );
}

/** Turn curated `sources` URLs into doc links when they look like docs/pricing. */
export function inferDocsFromSources(
  sources: readonly string[] | undefined,
  website: string,
): ProviderDocLink[] {
  if (!sources?.length) return [];
  const host = safeHost(website);
  const out: ProviderDocLink[] = [];

  for (const source of sources) {
    const url = source.trim();
    if (!url.startsWith("http")) continue;
    if (host && safeHost(url) && safeHost(url) !== host) {
      const path = url.toLowerCase();
      if (!/github\.com|docs\.|\.readthedocs|/i.test(path)) continue;
    }
    const description = describeSourceUrl(url);
    if (!description) continue;
    out.push({ description, link: url.replace(/\/$/, "") });
  }

  return mergeProviderDocs(out);
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function describeSourceUrl(url: string): string | null {
  const u = url.toLowerCase();
  if (/pricing|\/plans\b|billing/.test(u)) return "Pricing / billing";
  if (/\/docs\b|\.docs\.|documentation/.test(u)) return "Documentation hub";
  if (/\/api\b|api-reference|openapi/.test(u)) return "API reference";
  if (/github\.com\/[^/]+\/[^/]+\/blob\//.test(u)) return "GitHub docs (in-repo)";
  if (/github\.com\/[^/]+\/[^/]+\/?$/.test(u)) return "GitHub repository";
  if (/\/help\b|help\./.test(u)) return "Help center";
  if (/getting-started|quickstart|product-overview/.test(u))
    return "Getting started / overview";
  if (/agentsandboxes\.org\/sandboxes\//.test(u))
    return "agentsandboxes.org profile";
  return null;
}

export const DOCS_EXTRACT_HINT =
  "docs: array of { description, link } for official entry points — at minimum docs index and pricing/billing when public. " +
  'description explains what the page contains (e.g. "Sandbox API reference", "Pricing and plans", "Self-host install guide"). ' +
  "Use canonical HTTPS URLs on the vendor domain or main GitHub repo; include pricing links whenever listed.";