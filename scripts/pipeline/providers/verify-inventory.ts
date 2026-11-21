import { providerHostKey } from "@/lib/dedupe-providers";
import type { SandboxProvider } from "@/schemas/provider";
import type { FirecrawlClient } from "../firecrawl/client.ts";
import {
  applyReconciliation,
  firecrawlReconcileProvider,
} from "./reconcile.ts";
import { isListedProvider, needsStaleReverify } from "./status.ts";
import { checkWebsiteHttp, mapWithConcurrency } from "./verify-http.ts";

export type VerifyProvidersConfig = {
  httpConcurrency: number;
  maxFirecrawlReconcilePerRun: number;
  staleVerificationDays: number;
  alwaysReconcileNewDomains: boolean;
};

export type VerifyInventoryResult = {
  rows: SandboxProvider[];
  httpChecked: number;
  firecrawlReconciled: number;
  removedInactive: number;
};

export async function verifyAndReconcileInventory(
  client: FirecrawlClient,
  rows: SandboxProvider[],
  config: VerifyProvidersConfig,
  newlyAddedKeys: ReadonlySet<string> = new Set(),
): Promise<VerifyInventoryResult> {
  const beforeCount = rows.length;

  const withHttp = await mapWithConcurrency(
    rows,
    config.httpConcurrency,
    async (row) => {
      const check = await checkWebsiteHttp(row.website);
      return {
        ...row,
        website_status: check.website_status,
        website_check: check.website_check,
        _hostChanged: check.hostChanged,
      };
    },
  );

  let firecrawlBudget = config.maxFirecrawlReconcilePerRun;
  let firecrawlReconciled = 0;
  const reconciled: SandboxProvider[] = [];

  for (const row of withHttp) {
    const key = providerHostKey(row);
    const hostChanged =
      (row as { _hostChanged?: boolean })._hostChanged === true;
    const stale = needsStaleReverify(row, config.staleVerificationDays);
    const isNew =
      config.alwaysReconcileNewDomains &&
      Boolean(key && newlyAddedKeys.has(key));

    const needsFirecrawl =
      firecrawlBudget > 0 &&
      (row.website_status === "broken" ||
        row.website_status === "blocked" ||
        hostChanged ||
        stale ||
        isNew ||
        row.provider_status === undefined ||
        !row.sandbox_capabilities?.length ||
        !row.isolation_technologies?.length);

    const { _hostChanged: _drop, ...clean } = row as SandboxProvider & {
      _hostChanged?: boolean;
    };

    if (!needsFirecrawl) {
      reconciled.push(clean);
      continue;
    }

    const scrapeUrl =
      clean.website_check?.final_url?.startsWith("http") &&
      clean.website_status !== "broken"
        ? clean.website_check.final_url
        : clean.website;

    const extract = await firecrawlReconcileProvider(client, clean, scrapeUrl);
    firecrawlBudget -= 1;
    firecrawlReconciled += 1;

    if (!extract) {
      reconciled.push({
        ...clean,
        last_verified_at: new Date().toISOString(),
      });
      continue;
    }

    reconciled.push(applyReconciliation(clean, extract));
  }

  const listed = reconciled.filter(isListedProvider);
  return {
    rows: listed,
    httpChecked: beforeCount,
    firecrawlReconciled,
    removedInactive: beforeCount - listed.length,
  };
}
