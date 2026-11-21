import type { SourceCandidate } from "./types.ts";

export function mergeSourceCandidates(
  existing: readonly SourceCandidate[],
  incoming: readonly SourceCandidate[],
): SourceCandidate[] {
  const byUrl = new Map<string, SourceCandidate>();
  for (const row of existing) {
    byUrl.set(normalizeUrl(row.url), row);
  }
  for (const row of incoming) {
    const key = normalizeUrl(row.url);
    const prev = byUrl.get(key);
    if (!prev || row.score > prev.score) {
      byUrl.set(key, {
        ...row,
        status: prev?.status === "promoted" ? "promoted" : row.status,
      });
    } else if (prev && row.discoveredVia !== prev.discoveredVia) {
      prev.rationale = `${prev.rationale} | also: ${row.discoveredVia}`;
    }
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score);
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "").toLowerCase();
}
