import type { SandboxProvider } from "@/schemas/provider";
import { mergeSandboxCapabilities } from "@/schemas/sandbox-capabilities";
import { mergeIsolationTechnologies } from "@/schemas/isolation-technologies";
import { mergeProviderDocs } from "@/schemas/provider-docs";
import { isGeneratedFaviconUrl, resolveLogoUrl } from "@/lib/logo-url";
import type { ProviderDiscoveryRow } from "./types.ts";

type MetadataPatch = Partial<
  Pick<
    ProviderDiscoveryRow,
    | "offering_type"
    | "availability"
    | "launch_stage"
    | "category_guess"
    | "sandbox_capabilities"
    | "isolation_technologies"
    | "logo_url"
    | "docs"
    | "name"
  >
>;

function isUnknownOffering(
  value: SandboxProvider["offering_type"] | undefined,
): boolean {
  return !value || value === "unknown";
}

function isUnknownAvailability(
  value: SandboxProvider["availability"] | undefined,
): boolean {
  return !value || value === "unknown";
}

function isUnknownStage(
  value: SandboxProvider["launch_stage"] | undefined,
): boolean {
  return !value || value === "unknown";
}

function isWeakCategory(category: string | undefined): boolean {
  return (
    !category ||
    category === "Discovered" ||
    category === "Other / verify category"
  );
}

/** Merge listing metadata from a discovery row or another inventory row. */
export function applyMetadataPatch(
  prev: SandboxProvider,
  patch: MetadataPatch,
  mode: "fill_unknown" | "overwrite",
): void {
  const incomingName = patch.name?.trim();
  if (incomingName && incomingName !== prev.name) {
    const oldName = prev.name;
    prev.name = incomingName;
    if (!prev.display_name || prev.display_name === oldName) {
      prev.display_name = incomingName;
    }
  }

  if (patch.offering_type && patch.offering_type !== "unknown") {
    if (mode === "overwrite" || isUnknownOffering(prev.offering_type)) {
      prev.offering_type = patch.offering_type;
    }
  }
  if (patch.availability && patch.availability !== "unknown") {
    if (mode === "overwrite" || isUnknownAvailability(prev.availability)) {
      prev.availability = patch.availability;
    }
  }
  if (patch.launch_stage && patch.launch_stage !== "unknown") {
    if (mode === "overwrite" || isUnknownStage(prev.launch_stage)) {
      prev.launch_stage = patch.launch_stage;
    }
  }
  if (patch.category_guess && isWeakCategory(prev.category_guess)) {
    prev.category_guess = patch.category_guess;
  }

  const caps = mergeSandboxCapabilities(
    prev.sandbox_capabilities,
    patch.sandbox_capabilities,
  );
  if (caps.length > 0) prev.sandbox_capabilities = caps;

  const techs = mergeIsolationTechnologies(
    prev.isolation_technologies,
    patch.isolation_technologies,
  );
  if (techs.length > 0) prev.isolation_technologies = techs;

  const logo = resolveLogoUrl(prev.website, patch.logo_url);
  if (logo) {
    if (
      mode === "overwrite" ||
      !prev.logo_url ||
      isGeneratedFaviconUrl(prev.logo_url)
    ) {
      prev.logo_url = logo;
    }
  }

  if (patch.docs?.length) {
    prev.docs = mergeProviderDocs(prev.docs, patch.docs);
  }
}

export function mergeInventoryRows(
  primary: SandboxProvider,
  secondary: SandboxProvider,
): SandboxProvider {
  const merged = structuredClone(primary);

  const sources = new Set([
    ...(merged.sources ?? []),
    ...(secondary.sources ?? []),
  ]);
  merged.sources = [...sources];

  const discovery = new Set([
    ...(merged.discovery ?? []),
    ...(secondary.discovery ?? []),
  ]);
  if (discovery.size > 0) merged.discovery = [...discovery];

  const funding = new Set([
    ...(merged.funding ?? []),
    ...(secondary.funding ?? []),
  ]);
  if (funding.size > 0) merged.funding = [...funding];

  applyMetadataPatch(merged, secondary, "fill_unknown");

  if (!merged.profile && secondary.profile) merged.profile = secondary.profile;

  const techUnion = mergeIsolationTechnologies(
    merged.isolation_technologies,
    secondary.isolation_technologies,
  );
  if (techUnion.length > 0) merged.isolation_technologies = techUnion;

  const mergedIsolation = new Set([
    ...(merged.isolation ?? []),
    ...(secondary.isolation ?? []),
  ]);
  if (mergedIsolation.size > 0) merged.isolation = [...mergedIsolation];

  merged.docs = mergeProviderDocs(merged.docs, secondary.docs);

  if (
    !merged.last_verified_at ||
    (secondary.last_verified_at &&
      secondary.last_verified_at > merged.last_verified_at)
  ) {
    merged.last_verified_at = secondary.last_verified_at;
    if (secondary.provider_status)
      merged.provider_status = secondary.provider_status;
    if (secondary.reconciliation)
      merged.reconciliation = secondary.reconciliation;
  }

  return merged;
}
