import type { FirecrawlClient } from "../firecrawl/client.ts";
import { scrapeWithExtract } from "../firecrawl/extract.ts";
import { searchWeb } from "../firecrawl/search.ts";
import { rowsFromMentionItems } from "../providers/extract-mentions.ts";
import { MENTION_EXTRACT_PROMPT } from "../providers/mention-prompt.ts";
import { PROVIDER_EXTRACT_SCHEMA } from "../providers/schemas.ts";
import type { ProviderDiscoveryRow } from "../providers/types.ts";
import type { SourceDiscoveryConfig } from "./types.ts";
import { qualifiesAsProviderSource, scoreSourceCandidate } from "./qualify.ts";

const MENTION_HOST =
  /news\.ycombinator\.com|ycombinator\.com\/companies\/|medium\.com|substack\.com|dev\.to|x\.com|twitter\.com|blog\.|\.engineering|linkedin\.com\/posts|producthunt\.com\/posts|ph\.co\/|reddit\.com\/r\/|northflank\.com\/blog|fly\.io\/learn|vercel\.com\/blog|modal\.com\/blog|daytona\.io\/blog|e2b\.dev\/blog/i;

const SKIP_HOST = /wikipedia\.org|googletagmanager/i;

function isMentionPageUrl(url: string): boolean {
  if (SKIP_HOST.test(url)) return false;
  return MENTION_HOST.test(url);
}

function isHighValueListPage(
  url: string,
  title: string,
  description?: string,
): boolean {
  const score = scoreSourceCandidate({ url, title, description });
  return (
    qualifiesAsProviderSource({ url, title, description }) && score >= 0.68
  );
}

export async function discoverProvidersFromMentionSearch(
  client: FirecrawlClient,
  config: SourceDiscoveryConfig,
): Promise<ProviderDiscoveryRow[]> {
  const queries = config.mentionSearchQueries ?? [];
  const limit = config.mentionSearchLimit ?? config.searchLimit;
  const deep = Math.max(0, config.deepExtractTopSearchHits ?? 0);
  if (!queries.length || deep === 0) return [];

  const out: ProviderDiscoveryRow[] = [];
  const seenPages = new Set<string>();

  for (const query of queries) {
    try {
      const hits = await searchWeb(client, query, { limit });
      const slice = hits.slice(0, deep);
      console.log(
        `mention search "${query}": ${hits.length} hits, deep ${slice.length}`,
      );

      for (const hit of slice) {
        const url = hit.url?.trim();
        if (!url?.startsWith("http")) continue;
        const key = url.toLowerCase().replace(/\/$/, "");
        if (seenPages.has(key)) continue;

        const title = hit.title?.trim() ?? "";
        if (isHighValueListPage(url, title, hit.description)) continue;
        if (!isMentionPageUrl(url)) continue;

        seenPages.add(key);
        try {
          const items = await scrapeWithExtract<
            { providers: { name?: string; website?: string }[] },
            "providers",
            { name?: string; website?: string }
          >(client, url, {
            prompt: MENTION_EXTRACT_PROMPT,
            schema: PROVIDER_EXTRACT_SCHEMA,
            collectionKey: "providers",
          });
          const rows = rowsFromMentionItems(
            items,
            `mention:${query.slice(0, 48)}`,
          );
          out.push(...rows);
          if (rows.length > 0) {
            console.log(`  mention extract ${url}: ${rows.length} providers`);
          }
        } catch (err) {
          console.warn(`  mention skip ${url}:`, err);
        }
      }
    } catch (err) {
      console.warn(`mention search skip "${query}":`, err);
    }
  }

  return out;
}
