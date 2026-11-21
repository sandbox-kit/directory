import {
  providerHostKey,
  providerRowRank,
  providerVendorKey,
} from "@/lib/dedupe-providers";
import type { SandboxProvider } from "@/schemas/provider";
import { isExcluded, normDomain } from "./excludes.ts";
import { qualifiesAgentSandbox } from "./qualify.ts";
import type { ProviderDiscoveryRow } from "./types.ts";
import { applyMetadataPatch } from "./merge-fields.ts";

function refreshVendorIndex(
  byKey: Map<string, SandboxProvider>,
  byVendor: Map<string, SandboxProvider>,
): void {
  byVendor.clear();
  for (const row of byKey.values()) {
    const vendorKey = providerVendorKey(row);
    if (!vendorKey) continue;
    const prev = byVendor.get(vendorKey);
    if (!prev || providerRowRank(row) > providerRowRank(prev)) {
      byVendor.set(vendorKey, row);
    }
  }
}

/** Dedupe discovery extractions before merging into inventory. */
export function dedupeDiscoveryRows(
  rows: ProviderDiscoveryRow[],
): ProviderDiscoveryRow[] {
  const byKey = new Map<string, ProviderDiscoveryRow>();
  for (const item of rows) {
    const probe: SandboxProvider = {
      slug: "probe",
      name: item.name.trim() || "Unknown",
      website: item.website.trim(),
    };
    const key = providerHostKey(probe);
    if (!key) continue;

    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, {
        ...item,
        sources: [...item.sources],
      });
      continue;
    }

    const sources = new Set([...prev.sources, ...item.sources]);
    prev.sources = [...sources];
    if (!prev.profile && item.profile) prev.profile = item.profile;
    if (!prev.logo_url && item.logo_url) prev.logo_url = item.logo_url;
    if (!prev.docs?.length && item.docs?.length) prev.docs = item.docs;
  }
  return [...byKey.values()];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function mergeDiscoveries(
  existing: SandboxProvider[],
  incoming: ProviderDiscoveryRow[],
): { merged: SandboxProvider[]; added: number; addedKeys: string[] } {
  const byKey = new Map<string, SandboxProvider>();
  const byVendor = new Map<string, SandboxProvider>();
  for (const row of existing) {
    const key = providerHostKey(row);
    if (key) byKey.set(key, structuredClone(row));
  }
  refreshVendorIndex(byKey, byVendor);

  let added = 0;
  const addedKeys: string[] = [];
  for (const item of dedupeDiscoveryRows(incoming)) {
    const url = item.website.trim();
    const name = item.name.trim() || "Unknown";
    if (!url.startsWith("http") || isExcluded(url, name)) continue;

    if (
      !qualifiesAgentSandbox(name, url, {
        sources: item.sources,
        offering_type: item.offering_type,
        availability: item.availability,
      })
    ) {
      continue;
    }

    const probe: SandboxProvider = {
      slug: "probe",
      name,
      website: url,
    };
    const key = providerHostKey(probe);
    if (!key) continue;

    const prev = byKey.get(key);
    if (prev) {
      const sources = new Set(prev.sources ?? []);
      for (const s of item.sources) sources.add(s);
      prev.sources = [...sources];
      applyMetadataPatch(prev, item, "fill_unknown");
      refreshVendorIndex(byKey, byVendor);
      continue;
    }

    const vendorKey = providerVendorKey(probe);
    if (vendorKey) {
      const vendorRow = byVendor.get(vendorKey);
      if (vendorRow) {
        const sources = new Set(vendorRow.sources ?? []);
        for (const s of item.sources) sources.add(s);
        vendorRow.sources = [...sources];
        applyMetadataPatch(vendorRow, item, "fill_unknown");
        continue;
      }
    }

    let slug = slugify(name);
    const usedSlugs = new Set(
      [...byKey.values()].map((r) => r.slug.toLowerCase()),
    );
    if (usedSlugs.has(slug)) {
      const suffix = normDomain(url).split(".")[0] ?? "provider";
      slug = `${slug}-${suffix}`.slice(0, 80);
    }

    const entry: SandboxProvider = {
      slug,
      name,
      website: url.endsWith(".md") ? url : url.replace(/\/$/, ""),
      profile: item.profile ?? null,
      category_guess: item.category_guess ?? "Discovered",
      sources: [...item.sources],
      extra: true,
      offering_type: item.offering_type,
      availability: item.availability,
      launch_stage: item.launch_stage,
      sandbox_capabilities: item.sandbox_capabilities,
      isolation_technologies: item.isolation_technologies,
      logo_url: item.logo_url,
      docs: item.docs,
    };
    byKey.set(key, entry);
    added += 1;
    addedKeys.push(key);
    refreshVendorIndex(byKey, byVendor);
  }

  return { merged: [...byKey.values()], added, addedKeys };
}
