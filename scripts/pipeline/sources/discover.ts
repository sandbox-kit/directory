import type { FirecrawlClient } from "../firecrawl/client.ts";
import { scrapeWithExtract } from "../firecrawl/extract.ts";
import { searchWeb, type FirecrawlSearchHit } from "../firecrawl/search.ts";
import type { FirecrawlSourceConfig } from "../providers/types.ts";
import {
  inferSourceKind,
  qualifiesAsProviderSource,
  scoreSourceCandidate,
  slugFromUrl,
  yieldFromScore,
} from "./qualify.ts";
import { SOURCE_EXTRACT_PROMPT } from "./prompts.ts";
import { SOURCE_EXTRACT_SCHEMA } from "./schemas.ts";
import type {
  SourceCandidate,
  SourceDiscoveryConfig,
  SourceExtract,
  SourceExtractItem,
} from "./types.ts";

function hitToCandidate(
  hit: FirecrawlSearchHit,
  discoveredVia: string,
): SourceCandidate | null {
  const url = hit.url?.trim();
  const title = hit.title?.trim() ?? "";
  if (!url?.startsWith("http")) return null;

  const score = scoreSourceCandidate({
    url,
    title,
    description: hit.description,
  });
  if (
    !qualifiesAsProviderSource({ url, title, description: hit.description })
  ) {
    return null;
  }

  const kind = inferSourceKind(url, title);
  return {
    id: slugFromUrl(url),
    url,
    title: title || url,
    kind,
    yield: yieldFromScore(score),
    score,
    rationale:
      hit.description?.trim() ||
      "Matched sandbox list heuristics from web search.",
    discoveredVia,
    status: "pending",
    discoveredAt: new Date().toISOString(),
  };
}

function extractItemToCandidate(
  item: SourceExtractItem,
  discoveredVia: string,
): SourceCandidate | null {
  const url = item.url?.trim();
  const title = item.title?.trim() ?? "";
  if (!url?.startsWith("http")) return null;

  const kind = inferSourceKind(url, title);
  const score = scoreSourceCandidate({
    url,
    title,
    description: item.rationale,
    kind,
    likelyProviderCount: item.likelyProviderCount,
  });
  if (
    !qualifiesAsProviderSource({
      url,
      title,
      description: item.rationale,
      kind,
    })
  ) {
    return null;
  }

  return {
    id: slugFromUrl(url),
    url,
    title: title || url,
    kind,
    yield: yieldFromScore(score),
    score,
    rationale:
      item.rationale?.trim() || "Extracted as multi-provider sandbox index.",
    discoveredVia,
    status: "pending",
    discoveredAt: new Date().toISOString(),
  };
}

export async function discoverSourcesFromSearch(
  client: FirecrawlClient,
  config: SourceDiscoveryConfig,
): Promise<SourceCandidate[]> {
  const out: SourceCandidate[] = [];
  for (const query of config.searchQueries) {
    try {
      const hits = await searchWeb(client, query, {
        limit: config.searchLimit,
      });
      for (const hit of hits) {
        const row = hitToCandidate(hit, `search:${query}`);
        if (row) out.push(row);
      }
      console.log(`search "${query}": ${hits.length} hits`);
    } catch (err) {
      console.warn(`search skip "${query}":`, err);
    }
  }
  return out;
}

export async function discoverSourcesFromHub(
  client: FirecrawlClient,
  hubUrl: string,
  hubId: string,
): Promise<SourceCandidate[]> {
  const items = await scrapeWithExtract<
    SourceExtract,
    "sources",
    SourceExtractItem
  >(client, hubUrl, {
    prompt: SOURCE_EXTRACT_PROMPT,
    schema: SOURCE_EXTRACT_SCHEMA,
    collectionKey: "sources",
  });
  const out: SourceCandidate[] = [];
  for (const item of items) {
    const row = extractItemToCandidate(item, `hub:${hubId}`);
    if (row) out.push(row);
  }
  return out;
}

export async function discoverSourcesFromHubs(
  client: FirecrawlClient,
  hubs: { url: string; id?: string }[],
): Promise<SourceCandidate[]> {
  const out: SourceCandidate[] = [];
  for (const hub of hubs) {
    const id = hub.id ?? slugFromUrl(hub.url);
    try {
      const rows = await discoverSourcesFromHub(client, hub.url, id);
      console.log(`hub ${id}: ${rows.length} source candidates`);
      out.push(...rows);
    } catch (err) {
      console.warn(`hub skip ${id}:`, err);
    }
  }
  return out;
}

/** Promote high-scoring pending sources into active Firecrawl provider extract config. */
export function promoteCandidatesToSourceConfig(
  candidates: readonly SourceCandidate[],
  minScore: number,
  existing: readonly FirecrawlSourceConfig[],
): { promoted: SourceCandidate[]; sources: FirecrawlSourceConfig[] } {
  const knownUrls = new Set(
    existing.map((s) => s.url.toLowerCase().replace(/\/$/, "")),
  );
  const sources = [...existing];
  const promoted: SourceCandidate[] = [];

  for (const c of candidates) {
    if (c.status === "rejected") continue;
    if (c.score < minScore) continue;
    const key = c.url.toLowerCase().replace(/\/$/, "");
    if (knownUrls.has(key)) continue;

    const mode: FirecrawlSourceConfig["mode"] =
      c.kind === "github" || c.url.includes("/providers")
        ? "scrape"
        : c.yield === "high" && c.url.includes("boxyard")
          ? "crawl"
          : "scrape";

    sources.push({
      id: c.id,
      url: c.url,
      mode,
      ...(mode === "crawl" ? { limit: 35 } : {}),
    });
    knownUrls.add(key);
    promoted.push({ ...c, status: "promoted" });
  }

  return { promoted, sources };
}
