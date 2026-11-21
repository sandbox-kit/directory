import { normalizeAvailability, normalizeLaunchStage, normalizeOfferingType } from "./metadata.ts";
import { normalizeSandboxCapabilities } from "@/schemas/sandbox-capabilities";
import { normalizeIsolationTechnologies } from "@/schemas/isolation-technologies";
import { normalizeProviderDocs } from "@/schemas/provider-docs";
import { resolveLogoUrl } from "@/lib/logo-url";
import { isExcluded } from "./excludes.ts";
import { qualifiesAgentSandbox } from "./qualify.ts";
import type { ProviderDiscoveryRow } from "./types.ts";

type MentionItem = {
  name?: string;
  website?: string;
  offering_type?: string;
  availability?: string;
  launch_stage?: string;
  sandbox_capabilities?: string[];
  isolation_technologies?: string[];
  logo_url?: string;
  docs?: { description?: string; link?: string }[];
};

export function rowsFromMentionItems(
  items: MentionItem[],
  sourceTag: string,
): ProviderDiscoveryRow[] {
  const out: ProviderDiscoveryRow[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const name = (item.name ?? "").trim();
    const website = (item.website ?? "").trim();
    if (!name || !website.startsWith("http") || isExcluded(website, name)) continue;

    const offering_type = normalizeOfferingType(item.offering_type);
    const availability = normalizeAvailability(item.availability);
    const launch_stage = normalizeLaunchStage(item.launch_stage);
    const tag =
      sourceTag.startsWith("mention:") ? sourceTag : `mention:${sourceTag}`;

    if (
      !qualifiesAgentSandbox(name, website, {
        sources: [tag, "discovery:mention"],
        offering_type,
        availability,
      })
    ) {
      continue;
    }

    const key = website.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      name,
      website,
      sources: [tag, "discovery:mention"],
      extra: true,
      offering_type,
      availability,
      launch_stage,
      sandbox_capabilities: normalizeSandboxCapabilities(item.sandbox_capabilities),
      isolation_technologies: normalizeIsolationTechnologies(
        item.isolation_technologies,
      ),
      logo_url: resolveLogoUrl(website, item.logo_url),
      docs: normalizeProviderDocs(item.docs),
    });
  }

  return out;
}