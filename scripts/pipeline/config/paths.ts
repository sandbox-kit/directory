import path from "node:path";
import { repoRoot } from "../env.ts";

export const pipelinePaths = {
  inventory: path.join(repoRoot, "public/agent-sandbox-providers.json"),
  firecrawlSources: path.join(repoRoot, "config/firecrawl-sources.json"),
  sourceDiscovery: path.join(repoRoot, "config/source-discovery.json"),
  discoveredSources: path.join(repoRoot, "config/discovered-sources.json"),
  discoveredProviderMentions: path.join(
    repoRoot,
    "config/discovered-provider-mentions.json",
  ),
  verifyProviders: path.join(repoRoot, "config/verify-providers.json"),
} as const;
