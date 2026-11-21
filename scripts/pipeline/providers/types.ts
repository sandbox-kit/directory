import type { SandboxProvider } from "@/schemas/provider";
import type { SandboxCapability } from "@/schemas/sandbox-capabilities";
import type { IsolationTechnology } from "@/schemas/isolation-technologies";
import type { ProviderDocLink } from "@/schemas/provider-docs";

export type ProviderDiscoveryRow = {
  name: string;
  website: string;
  sources: string[];
  profile?: string | null;
  category_guess?: string;
  extra?: boolean;
  offering_type?: SandboxProvider["offering_type"];
  availability?: SandboxProvider["availability"];
  launch_stage?: SandboxProvider["launch_stage"];
  sandbox_capabilities?: SandboxCapability[];
  isolation_technologies?: IsolationTechnology[];
  logo_url?: string;
  docs?: ProviderDocLink[];
};

export type ProviderExtract = {
  providers: ProviderExtractItem[];
};

export type ProviderExtractItem = {
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

export type FirecrawlSourceConfig = {
  id: string;
  url: string;
  mode: "scrape" | "crawl";
  limit?: number;
  prompt?: string;
};

export type FirecrawlSourcesFile = {
  sources: FirecrawlSourceConfig[];
};
