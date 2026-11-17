import type { SandboxProvider } from "@/types/provider";

export function providerTitle(provider: SandboxProvider): string {
  return provider.display_name?.trim() || provider.name;
}
