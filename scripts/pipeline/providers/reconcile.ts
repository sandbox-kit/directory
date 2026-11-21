import type { SandboxProvider } from "@/schemas/provider";
import type { FirecrawlClient } from "../firecrawl/client.ts";
import { pickExtractPayload } from "../firecrawl/extract.ts";
import {
  normalizeAvailability,
  normalizeLaunchStage,
  normalizeOfferingType,
} from "./metadata.ts";
import { applyMetadataPatch } from "./merge-fields.ts";
import { qualifiesAgentSandbox } from "./qualify.ts";
import {
  RECONCILE_EXTRACT_SCHEMA,
  RECONCILE_PROMPT,
  type ReconcileExtract,
} from "./reconcile-schema.ts";
import {
  mergeSandboxCapabilities,
  normalizeSandboxCapabilities,
} from "@/schemas/sandbox-capabilities";
import { normalizeIsolationTechnologies } from "@/schemas/isolation-technologies";
import { normalizeProviderDocs } from "@/schemas/provider-docs";
import { resolveLogoUrl } from "@/lib/logo-url";
import type { ProviderStatus } from "./status.ts";

type ScrapeEnvelope = {
  data?: { extract?: ReconcileExtract; json?: ReconcileExtract };
  extract?: ReconcileExtract;
};

export async function firecrawlReconcileProvider(
  client: FirecrawlClient,
  provider: SandboxProvider,
  scrapeUrl?: string,
): Promise<ReconcileExtract | null> {
  const url = (scrapeUrl ?? provider.website).trim();
  try {
    const body = await client.post<ScrapeEnvelope>("/scrape", {
      url,
      formats: ["extract"],
      extract: {
        prompt: `${RECONCILE_PROMPT}\n\nListed name: ${provider.name}\nListed URL: ${provider.website}`,
        schema: RECONCILE_EXTRACT_SCHEMA,
      },
    });
    return (
      pickExtractPayload(body) ??
      body.data?.extract ??
      body.data?.json ??
      body.extract ??
      null
    );
  } catch {
    return null;
  }
}

export function applyReconciliation(
  provider: SandboxProvider,
  data: ReconcileExtract,
): SandboxProvider {
  const now = new Date().toISOString();
  const status = normalizeProviderStatus(data.provider_status);
  const next: SandboxProvider = {
    ...provider,
    last_verified_at: now,
    provider_status: status,
    reconciliation: {
      corrected_from: provider.reconciliation?.corrected_from,
      note: data.evidence,
      is_agent_sandbox: data.is_agent_sandbox,
    },
  };

  if (data.name?.trim()) {
    const newName = data.name.trim();
    const oldName = provider.name;
    next.name = newName;
    if (!next.display_name || next.display_name === oldName) {
      next.display_name = newName;
    }
  }

  const canonical = data.canonical_website?.trim();
  if (
    canonical?.startsWith("http") &&
    canonical !== provider.website &&
    qualifiesAgentSandbox(next.name, canonical, { sources: provider.sources })
  ) {
    next.website = canonical.replace(/\/$/, "");
    next.reconciliation = {
      corrected_from: provider.website,
      note: `URL corrected: ${data.evidence ?? ""}`.trim(),
      is_agent_sandbox: data.is_agent_sandbox,
    };
  }

  if (data.is_agent_sandbox === false) {
    next.provider_status = status === "unknown" ? "pivoted" : status;
  } else if (data.is_agent_sandbox === true && status === "unknown") {
    next.provider_status = "active";
  }

  const fromScrape = normalizeSandboxCapabilities(data.sandbox_capabilities);
  const caps = mergeSandboxCapabilities(
    provider.sandbox_capabilities,
    fromScrape,
  );
  if (caps.length > 0) next.sandbox_capabilities = caps;

  const listedStatus = next.provider_status ?? "unknown";
  if (shouldRefreshListingMetadata(data, listedStatus)) {
    applyMetadataPatch(
      next,
      {
        offering_type: normalizeOfferingType(data.offering_type),
        availability: normalizeAvailability(data.availability),
        launch_stage: normalizeLaunchStage(data.launch_stage),
        sandbox_capabilities: fromScrape.length > 0 ? fromScrape : undefined,
        isolation_technologies: normalizeIsolationTechnologies(
          data.isolation_technologies,
        ),
        logo_url: resolveLogoUrl(next.website, data.logo_url),
        docs: normalizeProviderDocs(data.docs),
      },
      "overwrite",
    );
  }

  return next;
}

function shouldRefreshListingMetadata(
  data: ReconcileExtract,
  status: ProviderStatus,
): boolean {
  if (data.is_agent_sandbox === false) return false;
  if (status === "pivoted" || status === "shutdown") return false;
  return data.is_agent_sandbox === true || status === "active";
}

function normalizeProviderStatus(raw?: string): ProviderStatus {
  const v = (raw ?? "unknown").trim().toLowerCase();
  if (
    v === "active" ||
    v === "inactive" ||
    v === "pivoted" ||
    v === "shutdown" ||
    v === "unknown"
  ) {
    return v;
  }
  if (v.includes("pivot")) return "pivoted";
  if (v.includes("shut") || v.includes("sunset") || v.includes("deprecat")) {
    return "shutdown";
  }
  if (v.includes("active")) return "active";
  return "unknown";
}
