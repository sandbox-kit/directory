import type { FirecrawlClient } from "../firecrawl/client.ts";
import { crawlWithExtract } from "../firecrawl/crawl.ts";
import { scrapeWithExtract } from "../firecrawl/extract.ts";
import { isExcluded } from "./excludes.ts";
import {
  categoryFromMetadata,
  normalizeAvailability,
  normalizeLaunchStage,
  normalizeOfferingType,
} from "./metadata.ts";
import { normalizeSandboxCapabilities } from "@/schemas/sandbox-capabilities";
import { normalizeIsolationTechnologies } from "@/schemas/isolation-technologies";
import { normalizeProviderDocs } from "@/schemas/provider-docs";
import { resolveLogoUrl } from "@/lib/logo-url";
import { PROVIDER_EXTRACT_PROMPT } from "./prompts.ts";
import { qualifiesAgentSandbox } from "./qualify.ts";
import { PROVIDER_EXTRACT_SCHEMA } from "./schemas.ts";
import type {
  FirecrawlSourceConfig,
  ProviderDiscoveryRow,
  ProviderExtract,
  ProviderExtractItem,
} from "./types.ts";

function itemToRow(
  item: ProviderExtractItem,
  sourceId: string,
): ProviderDiscoveryRow | null {
  const name = (item.name ?? "").trim();
  const website = (item.website ?? "").trim();
  if (!name || !website.startsWith("http") || isExcluded(website, name)) {
    return null;
  }
  const offering_type = normalizeOfferingType(item.offering_type);
  const availability = normalizeAvailability(item.availability);
  const launch_stage = normalizeLaunchStage(item.launch_stage);
  const sandbox_capabilities = normalizeSandboxCapabilities(
    item.sandbox_capabilities,
  );
  const isolation_technologies = normalizeIsolationTechnologies(
    item.isolation_technologies,
  );
  const logo_url = resolveLogoUrl(website, item.logo_url);
  const docs = normalizeProviderDocs(item.docs);
  const tag = `firecrawl:${sourceId}`;
  if (
    !qualifiesAgentSandbox(name, website, {
      sources: [tag],
      offering_type,
      availability,
    })
  ) {
    return null;
  }
  return {
    name,
    website,
    sources: [tag],
    extra: true,
    offering_type,
    availability,
    launch_stage,
    sandbox_capabilities:
      sandbox_capabilities.length > 0 ? sandbox_capabilities : undefined,
    isolation_technologies:
      isolation_technologies.length > 0 ? isolation_technologies : undefined,
    logo_url,
    docs: docs.length > 0 ? docs : undefined,
    category_guess: categoryFromMetadata(offering_type, availability),
  };
}

function rowsFromItems(
  items: ProviderExtractItem[],
  sourceId: string,
): ProviderDiscoveryRow[] {
  const out: ProviderDiscoveryRow[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const row = itemToRow(item, sourceId);
    if (!row) continue;
    const key = row.website.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

const extractOpts = {
  prompt: PROVIDER_EXTRACT_PROMPT,
  schema: PROVIDER_EXTRACT_SCHEMA,
  collectionKey: "providers" as const,
};

export async function extractProvidersFromSource(
  client: FirecrawlClient,
  source: FirecrawlSourceConfig,
): Promise<ProviderDiscoveryRow[]> {
  const prompt = source.prompt ?? PROVIDER_EXTRACT_PROMPT;
  const items =
    source.mode === "crawl"
      ? await crawlWithExtract<
          ProviderExtract,
          "providers",
          ProviderExtractItem
        >(client, source.url, {
          ...extractOpts,
          prompt,
          limit: source.limit ?? 30,
        })
      : await scrapeWithExtract<
          ProviderExtract,
          "providers",
          ProviderExtractItem
        >(client, source.url, { ...extractOpts, prompt });

  return rowsFromItems(items, source.id);
}

export async function extractProvidersFromAllSources(
  client: FirecrawlClient,
  sources: readonly FirecrawlSourceConfig[],
): Promise<ProviderDiscoveryRow[]> {
  const out: ProviderDiscoveryRow[] = [];
  for (const source of sources) {
    try {
      const rows = await extractProvidersFromSource(client, source);
      console.log(`providers ${source.id} (${source.mode}): ${rows.length}`);
      out.push(...rows);
    } catch (err) {
      console.warn(`providers skip ${source.id}:`, err);
    }
  }
  return out;
}
