import type { SandboxProvider } from "@/types/provider";

export const DEFAULT_PROVIDER_LOGO = "/logo.png";

/** Single URL from inventory (resolved offline). No client-side candidate waterfall. */
export function providerLogoSrc(provider: SandboxProvider): string | null {
  const url = provider.logo_url?.trim();
  return url || null;
}
