import type { SandboxProvider } from "@/schemas/provider";

export type ProviderStatus = NonNullable<SandboxProvider["provider_status"]>;

export function isListedProvider(row: SandboxProvider): boolean {
  const s = row.provider_status ?? "unknown";
  if (s === "pivoted" || s === "shutdown") return false;
  if (row.reconciliation?.is_agent_sandbox === false) return false;
  return true;
}

export function needsStaleReverify(
  row: SandboxProvider,
  staleDays: number,
): boolean {
  const at = row.last_verified_at;
  if (!at) return true;
  const ageMs = Date.now() - Date.parse(at);
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
}
