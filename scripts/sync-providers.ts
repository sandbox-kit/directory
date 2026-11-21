import "dotenv/config";
import { dedupeProvidersByHost } from "@/lib/dedupe-providers";
import { collapseProvidersByHost } from "./pipeline/providers/collapse-hosts.ts";
import {
  formatProviderParseError,
  sandboxProvidersSchema,
  type SandboxProvider,
} from "@/schemas/provider";
import { pipelinePaths } from "./pipeline/config/paths.ts";
import { requireFirecrawlApiKey } from "./pipeline/env.ts";
import { FirecrawlClient } from "./pipeline/firecrawl/client.ts";
import { readJsonFile, writeJsonFile } from "./pipeline/io/json.ts";
import { enrichProviders } from "./pipeline/providers/enrich.ts";
import { extractProvidersFromAllSources } from "./pipeline/providers/extract-from-sources.ts";
import { mergeDiscoveries } from "./pipeline/providers/merge.ts";
import {
  filterMergedForInventory,
  inventoryIdentity,
} from "./pipeline/providers/qualify.ts";
import type {
  FirecrawlSourcesFile,
  ProviderDiscoveryRow,
} from "./pipeline/providers/types.ts";
import type { DiscoveredMentionsFile } from "./pipeline/sources/types.ts";
import type { VerifyProvidersConfig } from "./pipeline/providers/verify-inventory.ts";
import { verifyAndReconcileInventory } from "./pipeline/providers/verify-inventory.ts";

function loadExisting(): SandboxProvider[] {
  try {
    const json = readJsonFile<unknown>(pipelinePaths.inventory);
    const parsed = sandboxProvidersSchema.safeParse(json);
    if (parsed.success) return parsed.data;
    console.warn(
      "Existing inventory failed Zod parse; starting merge from raw JSON array.",
    );
    return Array.isArray(json) ? (json as SandboxProvider[]) : [];
  } catch {
    console.warn("No existing inventory; starting empty.");
    return [];
  }
}

function loadMentionDiscoveries(): ProviderDiscoveryRow[] {
  try {
    const file = readJsonFile<DiscoveredMentionsFile>(
      pipelinePaths.discoveredProviderMentions,
    );
    return file.providers ?? [];
  } catch {
    return [];
  }
}

function sortProviders(rows: SandboxProvider[]): SandboxProvider[] {
  return [...rows].sort((a, b) =>
    (a.display_name ?? a.name).localeCompare(b.display_name ?? b.name, "en", {
      sensitivity: "base",
    }),
  );
}

async function main(): Promise<void> {
  const client = new FirecrawlClient({ apiKey: requireFirecrawlApiKey() });
  const { sources } = readJsonFile<FirecrawlSourcesFile>(
    pipelinePaths.firecrawlSources,
  );

  const existing = loadExisting();
  const priorInventory = inventoryIdentity(existing);
  const fromSources = await extractProvidersFromAllSources(client, sources);
  const fromMentions = loadMentionDiscoveries();
  const discoveries = [...fromSources, ...fromMentions];
  console.log(
    `provider rows: ${discoveries.length} (${fromSources.length} sources + ${fromMentions.length} mentions)`,
  );

  const { merged, added, addedKeys } = mergeDiscoveries(existing, discoveries);
  const { kept: pruned, droppedNew } = filterMergedForInventory(
    merged,
    priorInventory,
  );
  if (droppedNew > 0) {
    console.log(
      `pruned ${droppedNew} new non-vendor rows (inventory retained)`,
    );
  }

  const enriched = enrichProviders(pruned);
  const verifyConfig = readJsonFile<VerifyProvidersConfig>(
    pipelinePaths.verifyProviders,
  );
  const verify = await verifyAndReconcileInventory(
    client,
    enriched,
    verifyConfig,
    new Set(addedKeys),
    priorInventory,
  );
  console.log(
    `verify: HTTP ${verify.httpChecked}, Firecrawl ${verify.firecrawlReconciled}, removed inactive/pivoted ${verify.removedInactive}`,
  );

  const { rows: collapsed, collapsed: mergedDuplicates } =
    collapseProvidersByHost(verify.rows);
  if (mergedDuplicates > 0) {
    console.log(
      `collapsed ${mergedDuplicates} duplicate host(s) after URL verify`,
    );
  }
  const rows = sortProviders(dedupeProvidersByHost(collapsed));

  const parsed = sandboxProvidersSchema.safeParse(rows);
  if (!parsed.success) {
    console.error(
      `Validation failed: ${formatProviderParseError(parsed.error)}`,
    );
    process.exit(1);
  }

  writeJsonFile(pipelinePaths.inventory, parsed.data);
  console.log(
    `Wrote ${parsed.data.length} providers (${added} new domains) → public/agent-sandbox-providers.json`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
