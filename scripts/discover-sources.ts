import "dotenv/config";
import { pipelinePaths } from "./pipeline/config/paths.ts";
import { requireFirecrawlApiKey } from "./pipeline/env.ts";
import { FirecrawlClient } from "./pipeline/firecrawl/client.ts";
import { readJsonFile, writeJsonFile } from "./pipeline/io/json.ts";
import type { FirecrawlSourcesFile } from "./pipeline/providers/types.ts";
import {
  discoverSourcesFromHubs,
  discoverSourcesFromSearch,
  promoteCandidatesToSourceConfig,
} from "./pipeline/sources/discover.ts";
import { discoverProvidersFromMentionSearch } from "./pipeline/sources/discover-mentions.ts";
import { mergeSourceCandidates } from "./pipeline/sources/merge-candidates.ts";
import type {
  DiscoveredMentionsFile,
  DiscoveredSourcesFile,
  SourceDiscoveryConfig,
} from "./pipeline/sources/types.ts";

async function main(): Promise<void> {
  const apiKey = requireFirecrawlApiKey();
  const client = new FirecrawlClient({ apiKey });

  const discoveryConfig = readJsonFile<SourceDiscoveryConfig>(
    pipelinePaths.sourceDiscovery,
  );
  const registry = readJsonFile<DiscoveredSourcesFile>(
    pipelinePaths.discoveredSources,
  );
  const activeSources = readJsonFile<FirecrawlSourcesFile>(
    pipelinePaths.firecrawlSources,
  );

  const fromSearch = await discoverSourcesFromSearch(client, discoveryConfig);
  const fromHubs = await discoverSourcesFromHubs(
    client,
    discoveryConfig.hubPages,
  );

  const merged = mergeSourceCandidates(registry.candidates, [
    ...fromSearch,
    ...fromHubs,
  ]);

  const { promoted, sources } = promoteCandidatesToSourceConfig(
    merged,
    discoveryConfig.autoPromoteMinScore,
    activeSources.sources,
  );

  const candidates = merged.map((c) =>
    promoted.some((p) => p.url === c.url)
      ? { ...c, status: "promoted" as const }
      : c,
  );

  writeJsonFile(pipelinePaths.discoveredSources, {
    updatedAt: new Date().toISOString(),
    candidates,
  } satisfies DiscoveredSourcesFile);

  if (promoted.length > 0) {
    writeJsonFile(pipelinePaths.firecrawlSources, { sources });
    console.log(
      `Promoted ${promoted.length} new source(s) → config/firecrawl-sources.json`,
    );
  }

  console.log(
    `Registry: ${candidates.length} candidates (${promoted.length} newly promoted) → config/discovered-sources.json`,
  );

  const mentionRows = await discoverProvidersFromMentionSearch(
    client,
    discoveryConfig,
  );
  writeJsonFile(pipelinePaths.discoveredProviderMentions, {
    updatedAt: new Date().toISOString(),
    providers: mentionRows,
  } satisfies DiscoveredMentionsFile);
  console.log(
    `Mentions: ${mentionRows.length} provider row(s) → config/discovered-provider-mentions.json`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
