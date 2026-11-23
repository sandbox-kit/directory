import { providerHostKey, providerRowRank } from "@/lib/dedupe-providers";
import type { SandboxProvider } from "@/schemas/provider";
import { mergeInventoryRows } from "./merge-fields.ts";

export type CollapseRedundantResult = {
  rows: SandboxProvider[];
  collapsed: number;
};

function displayNameKey(provider: SandboxProvider): string {
  return (provider.display_name ?? provider.name).toLowerCase().trim();
}

function isGithubScopedHost(hostKey: string): boolean {
  return hostKey.startsWith("github.com/");
}

function isYcCompanyUrl(url: string): boolean {
  return /ycombinator\.com\/companies\//i.test(url);
}

/**
 * True when `secondary` is a weaker duplicate of `primary` (same display name group).
 * Examples: GitHub mirror row, YC company listing, broken Boxyard placeholder, weaker catalog page.
 */
export function shouldMergeRedundantProvider(
  secondary: SandboxProvider,
  primary: SandboxProvider,
): boolean {
  const secHost = providerHostKey(secondary);
  const priHost = providerHostKey(primary);
  const secRank = providerRowRank(secondary);
  const priRank = providerRowRank(primary);

  if (isGithubScopedHost(secHost) && !isGithubScopedHost(priHost)) {
    return true;
  }

  if (isYcCompanyUrl(secondary.website) && !isYcCompanyUrl(primary.website)) {
    return true;
  }

  const secStatus = secondary.website_status ?? "";
  const priStatus = primary.website_status ?? "";
  if (secStatus === "broken" && priStatus !== "broken") {
    return true;
  }

  if (priRank > secRank) {
    return true;
  }

  return false;
}

/** Merge same-display-name rows when one is a mirror, listing page, or broken placeholder. */
export function collapseProvidersByDisplayName(
  list: SandboxProvider[],
): CollapseRedundantResult {
  const noDisplayName: SandboxProvider[] = [];
  const groups = new Map<string, SandboxProvider[]>();

  for (const row of list) {
    const key = displayNameKey(row);
    if (!key) {
      noDisplayName.push(structuredClone(row));
      continue;
    }
    const group = groups.get(key) ?? [];
    group.push(structuredClone(row));
    groups.set(key, group);
  }

  let collapsed = 0;
  const rows: SandboxProvider[] = [...noDisplayName];

  for (const group of groups.values()) {
    if (group.length === 1) {
      rows.push(group[0]!);
      continue;
    }

    const sorted = [...group].sort(
      (a, b) => providerRowRank(b) - providerRowRank(a),
    );
    let winner = sorted[0]!;

    for (const candidate of sorted.slice(1)) {
      if (!shouldMergeRedundantProvider(candidate, winner)) {
        rows.push(candidate);
        continue;
      }
      collapsed += 1;
      winner = mergeInventoryRows(winner, candidate);
    }

    rows.push(winner);
  }

  const slugSeen = new Set<string>();
  const deduped: SandboxProvider[] = [];
  for (const row of rows) {
    const slug = row.slug.toLowerCase();
    if (slugSeen.has(slug)) continue;
    slugSeen.add(slug);
    deduped.push(row);
  }

  return { rows: deduped, collapsed };
}
