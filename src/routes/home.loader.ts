import { loadProviders } from "@/lib/load-providers";
import type { SandboxProvider } from "@/types/provider";

export type HomeLoaderData = SandboxProvider[];

export async function homeLoader(): Promise<HomeLoaderData> {
  return loadProviders();
}
