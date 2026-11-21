import { dedupeProvidersByHost } from "@/lib/dedupe-providers";
import { enrichProviders } from "@/lib/enrich-providers";
import type { SandboxProvider } from "@/types/provider";

export const PROVIDERS_URL = "/agent-sandbox-providers.json";

function isSandboxProviderRow(value: unknown): value is SandboxProvider {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.slug === "string" &&
    row.slug.length > 0 &&
    typeof row.name === "string" &&
    row.name.length > 0 &&
    typeof row.website === "string" &&
    row.website.length > 0
  );
}

export async function loadProviders(
  signal?: AbortSignal,
): Promise<SandboxProvider[]> {
  const res = await fetch(PROVIDERS_URL, { signal });
  if (!res.ok) {
    throw new Response("Failed to load provider inventory", {
      status: res.status,
    });
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Response("Provider inventory is not valid JSON", { status: 502 });
  }

  if (!Array.isArray(json)) {
    throw new Response("Invalid provider inventory", { status: 502 });
  }

  if (!json.every(isSandboxProviderRow)) {
    throw new Response(
      "Provider inventory failed shape check (re-run npm run validate:providers)",
      {
        status: 502,
      },
    );
  }

  return enrichProviders(dedupeProvidersByHost(json));
}
