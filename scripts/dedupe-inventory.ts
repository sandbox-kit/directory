/**
 * Collapse duplicate providers in public/agent-sandbox-providers.json (offline).
 */
import { findInventoryDuplicates } from "@/lib/dedupe-providers";
import {
  formatProviderParseError,
  sandboxProvidersSchema,
  type SandboxProvider,
} from "@/schemas/provider";
import { finalizeProviderInventory } from "./pipeline/providers/collapse-hosts.ts";
import { pipelinePaths } from "./pipeline/config/paths.ts";
import { readJsonFile, writeJsonFile } from "./pipeline/io/json.ts";

function sortProviders(rows: SandboxProvider[]): SandboxProvider[] {
  return [...rows].sort((a, b) =>
    (a.display_name ?? a.name).localeCompare(b.display_name ?? b.name, "en", {
      sensitivity: "base",
    }),
  );
}

function main(): void {
  const before = readJsonFile<SandboxProvider[]>(pipelinePaths.inventory);
  const { rows, collapsedHost, collapsedVendor } =
    finalizeProviderInventory(before);
  const sorted = sortProviders(rows);
  const parsed = sandboxProvidersSchema.safeParse(sorted);
  if (!parsed.success) {
    console.error(
      `Validation failed: ${formatProviderParseError(parsed.error)}`,
    );
    process.exit(1);
  }

  const dupes = findInventoryDuplicates(parsed.data);
  writeJsonFile(pipelinePaths.inventory, parsed.data);

  console.log(
    `deduped inventory: ${before.length} → ${parsed.data.length} (host merges: ${collapsedHost}, vendor merges: ${collapsedVendor})`,
  );
  console.log(
    `duplicate slugs: ${dupes.duplicateSlugs.length}, host keys: ${dupes.duplicateHostKeys.length}, vendor keys: ${dupes.duplicateVendorKeys.length}`,
  );
}

main();
