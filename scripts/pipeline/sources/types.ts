export const SOURCE_KINDS = [
  "directory",
  "integrations",
  "blog",
  "github",
  "hackernews",
  "docs",
  "social",
  "comparison",
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_YIELDS = ["low", "medium", "high"] as const;
export type SourceYield = (typeof SOURCE_YIELDS)[number];

export type SourceCandidateStatus = "pending" | "promoted" | "rejected";

export type SourceCandidate = {
  id: string;
  url: string;
  title: string;
  kind: SourceKind;
  yield: SourceYield;
  /** 0–1 fitness as a multi-provider discovery page. */
  score: number;
  rationale: string;
  discoveredVia: string;
  status: SourceCandidateStatus;
  discoveredAt: string;
};

export type SourceExtractItem = {
  url?: string;
  title?: string;
  kind?: string;
  likelyProviderCount?: string;
  rationale?: string;
};

export type SourceExtract = {
  sources: SourceExtractItem[];
};

export type DiscoveredMentionsFile = {
  updatedAt: string;
  providers: import("../providers/types.ts").ProviderDiscoveryRow[];
};

export type SourceDiscoveryConfig = {
  searchQueries: string[];
  /** HN/X/blog queries — top hits scraped for vendor mentions (not list pages). */
  mentionSearchQueries?: string[];
  mentionSearchLimit?: number;
  hubPages: { url: string; id?: string }[];
  searchLimit: number;
  autoPromoteMinScore: number;
  deepExtractTopSearchHits: number;
};

export type DiscoveredSourcesFile = {
  updatedAt: string;
  candidates: SourceCandidate[];
};
