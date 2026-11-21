import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatProviderParseError,
  sandboxProvidersSchema,
  type SandboxProvider,
} from "@/schemas/provider";
import { providerHasPricingDoc } from "@/schemas/provider-docs";
import { enrichProviders } from "./pipeline/providers/enrich.ts";
import { keepInventoryRow, qualifiesAgentSandbox } from "./pipeline/providers/qualify.ts";
import { isListedProvider } from "./pipeline/providers/status.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));

function loadInventory(): SandboxProvider[] {
  const path = join(repoRoot, "../public/agent-sandbox-providers.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const parsed = sandboxProvidersSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(formatProviderParseError(parsed.error));
    process.exit(1);
  }
  return parsed.data;
}

type DropReason = "qualify" | "listed" | "ok";

function dropReason(row: SandboxProvider): DropReason {
  if (!keepInventoryRow(row)) return "qualify";
  if (!isListedProvider(row)) return "listed";
  return "ok";
}

function incompleteness(row: SandboxProvider): string[] {
  const gaps: string[] = [];
  if (!row.offering_type || row.offering_type === "unknown") gaps.push("offering_type");
  if (!row.sandbox_capabilities?.length) gaps.push("sandbox_capabilities");
  if (!row.isolation_technologies?.length) gaps.push("isolation_technologies");
  if (!row.docs?.length) gaps.push("docs");
  if (row.docs?.length && !providerHasPricingDoc(row.docs))
    gaps.push("pricing_doc");
  if (!row.provider_status) gaps.push("provider_status");
  if (row.website_status === "broken") gaps.push("website_broken");
  return gaps;
}

function main(): void {
  const rows = loadInventory();
  const enriched = enrichProviders(rows);

  const kept: SandboxProvider[] = [];
  const dropped: { row: SandboxProvider; reason: DropReason }[] = [];

  for (const row of enriched) {
    const reason = dropReason(row);
    if (reason === "ok") kept.push(row);
    else dropped.push({ row, reason });
  }

  const rediscoverOnly = kept.filter(
    (r) => !r.sources?.some((s) => s.startsWith("firecrawl:")),
  );

  const report = {
    generated_at: new Date().toISOString(),
    total: rows.length,
    would_keep: kept.length,
    would_drop: dropped.length,
    drop_by_reason: {
      qualify: dropped.filter((d) => d.reason === "qualify").length,
      listed: dropped.filter((d) => d.reason === "listed").length,
    },
    kept_without_firecrawl_source: rediscoverOnly.length,
    incomplete_field_counts: {
      offering_type: kept.filter((r) =>
        incompleteness(r).includes("offering_type"),
      ).length,
      sandbox_capabilities: kept.filter((r) =>
        incompleteness(r).includes("sandbox_capabilities"),
      ).length,
      isolation_technologies: kept.filter((r) =>
        incompleteness(r).includes("isolation_technologies"),
      ).length,
      docs: kept.filter((r) => incompleteness(r).includes("docs")).length,
      pricing_doc: kept.filter((r) =>
        incompleteness(r).includes("pricing_doc"),
      ).length,
    },
    dropped_sample: dropped.slice(0, 40).map(({ row, reason }) => ({
      slug: row.slug,
      name: row.name,
      website: row.website,
      reason,
      would_qualify_raw: qualifiesAgentSandbox(row.name, row.website, {
        sources: row.sources,
      }),
    })),
  };

  const outPath = join(repoRoot, "../config/provider-audit.latest.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Provider audit → ${outPath}`);
  console.log(`  total: ${report.total}`);
  console.log(`  would keep: ${report.would_keep}`);
  console.log(`  would drop: ${report.would_drop} (qualify: ${report.drop_by_reason.qualify}, status: ${report.drop_by_reason.listed})`);
  console.log(
    `  kept but no firecrawl source tag (seed-only): ${report.kept_without_firecrawl_source}`,
  );
  console.log("  incomplete (kept rows):", report.incomplete_field_counts);
}

main();