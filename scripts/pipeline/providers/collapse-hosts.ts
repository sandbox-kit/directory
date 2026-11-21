import { providerHostKey, providerRowRank } from "@/lib/dedupe-providers";
import type { SandboxProvider } from "@/schemas/provider";
import { mergeInventoryRows } from "./merge-fields.ts";

export type CollapseProvidersResult = {
  rows: SandboxProvider[];
  collapsed: number;
};

/**
 * After URL corrections, two rows may share the same host key — merge instead of dropping one.
 */
export function collapseProvidersByHost(
  list: SandboxProvider[],
): CollapseProvidersResult {
  const byKey = new Map<string, SandboxProvider>();
  let collapsed = 0;

  for (const row of list) {
    const key = providerHostKey(row);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, structuredClone(row));
      continue;
    }
    collapsed += 1;
    const keep = providerRowRank(row) > providerRowRank(prev) ? row : prev;
    const drop = keep === row ? prev : row;
    byKey.set(key, mergeInventoryRows(keep, drop));
  }

  const slugs = new Set<string>();
  const rows: SandboxProvider[] = [];
  for (const provider of byKey.values()) {
    const slug = provider.slug.toLowerCase();
    if (slugs.has(slug)) continue;
    slugs.add(slug);
    rows.push(provider);
  }

  return { rows, collapsed };
}
