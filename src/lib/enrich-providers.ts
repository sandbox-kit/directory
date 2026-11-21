import { displayDomain } from "@/lib/domain";
import { isGeneratedFaviconUrl, resolveLogoUrl } from "@/lib/logo-url";
import type { SandboxProvider } from "@/schemas/provider";
import {
  mergeSandboxCapabilities,
  normalizeSandboxCapabilities,
} from "@/schemas/sandbox-capabilities";
import {
  buildIsolationDisplay,
  isolationFromCapabilities,
  mergeIsolationTechnologies,
  normalizeIsolationTechnologies,
} from "@/schemas/isolation-technologies";
import {
  inferDocsFromSources,
  mergeProviderDocs,
} from "@/schemas/provider-docs";

function discoveryLabel(source: string): string {
  const m = source.match(/^firecrawl:(.+)$/i);
  return m?.[1] ?? source.split(":")[0] ?? source;
}

export function enrichProviders(rows: SandboxProvider[]): SandboxProvider[] {
  return rows.map((row) => {
    const host = displayDomain(row.website);
    const extractedLogo = resolveLogoUrl(row.website, row.logo_url);
    const favicon = host
      ? `https://www.google.com/s2/favicons?domain=${host}&sz=128`
      : undefined;
    const logo_url =
      extractedLogo ??
      (row.logo_url && !isGeneratedFaviconUrl(row.logo_url)
        ? row.logo_url
        : favicon);
    const display_name = row.display_name ?? row.name;
    const discovery = row.discovery ?? [
      ...new Set((row.sources ?? []).map(discoveryLabel).filter(Boolean)),
    ];
    const fromLegacy = normalizeSandboxCapabilities(row.isolation);
    const caps = mergeSandboxCapabilities(row.sandbox_capabilities, fromLegacy);
    const techs = mergeIsolationTechnologies(
      row.isolation_technologies,
      isolationFromCapabilities(caps),
      normalizeIsolationTechnologies(row.isolation),
    );
    const isolation = buildIsolationDisplay(techs, row.isolation);

    const profileDoc =
      row.profile?.startsWith("http") && row.profile.trim()
        ? [
            {
              description: "Third-party sandbox profile",
              link: row.profile.trim().replace(/\/$/, ""),
            },
          ]
        : [];
    const docs = mergeProviderDocs(
      row.docs,
      inferDocsFromSources(row.sources, row.website),
      profileDoc,
    );

    return {
      ...row,
      logo_url,
      display_name,
      discovery,
      funding: row.funding ?? [],
      isolation: isolation.length > 0 ? isolation : (row.isolation ?? []),
      isolation_technologies:
        techs.length > 0 ? techs : row.isolation_technologies,
      sandbox_capabilities: caps.length > 0 ? caps : row.sandbox_capabilities,
      docs: docs.length > 0 ? docs : row.docs,
    };
  });
}
