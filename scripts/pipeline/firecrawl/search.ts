import type { FirecrawlClient } from "./client.ts";

export type FirecrawlSearchHit = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
};

type SearchResponse = {
  success?: boolean;
  data?: FirecrawlSearchHit[];
};

export type SearchOptions = {
  limit?: number;
  /** When true, fetches markdown for each hit (slower, more credits). */
  withMarkdown?: boolean;
};

export async function searchWeb(
  client: FirecrawlClient,
  query: string,
  options: SearchOptions = {},
): Promise<FirecrawlSearchHit[]> {
  const limit = options.limit ?? 8;
  const body: Record<string, unknown> = { query, limit };
  if (options.withMarkdown) {
    body.scrapeOptions = { formats: ["markdown"] };
  }
  const res = await client.post<SearchResponse>("/search", body, 90_000);
  return res.data ?? [];
}