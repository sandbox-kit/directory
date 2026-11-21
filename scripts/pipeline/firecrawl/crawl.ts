import type { FirecrawlClient } from "./client.ts";
import { FirecrawlTimeoutError } from "./errors.ts";
import { pickExtractPayload, type ExtractFormatOptions } from "./extract.ts";

type CrawlStartResponse = { id?: string; status?: string };
type CrawlPage<TExtract> = { extract?: TExtract; json?: TExtract };
type CrawlStatusResponse<TExtract> = {
  status?: string;
  error?: string;
  data?: CrawlPage<TExtract>[];
};

export type CrawlExtractOptions<
  TExtract extends Record<string, unknown>,
  TCollectionKey extends keyof TExtract & string,
> = ExtractFormatOptions<TCollectionKey> & {
  limit: number;
  pollIntervalMs?: number;
  deadlineMs?: number;
};

export async function crawlWithExtract<
  TExtract extends Record<string, unknown>,
  TCollectionKey extends keyof TExtract & string,
  TItem = TExtract[TCollectionKey] extends (infer U)[] | undefined ? U : never,
>(
  client: FirecrawlClient,
  startUrl: string,
  options: CrawlExtractOptions<TExtract, TCollectionKey>,
): Promise<TItem[]> {
  const started = await client.post<CrawlStartResponse>("/crawl", {
    url: startUrl,
    limit: options.limit,
    scrapeOptions: {
      formats: ["extract"],
      extract: {
        prompt: options.prompt,
        schema: options.schema,
      },
    },
  });
  const jobId = started.id;
  if (!jobId) {
    throw new Error("Firecrawl crawl missing job id");
  }

  const pollMs = options.pollIntervalMs ?? 3_000;
  const deadline = Date.now() + (options.deadlineMs ?? 10 * 60_000);

  while (Date.now() < deadline) {
    await sleep(pollMs);
    const status = await client.get<CrawlStatusResponse<TExtract>>(
      `/crawl/${jobId}`,
    );
    if (status.status === "failed") {
      throw new Error(status.error ?? "Firecrawl crawl failed");
    }
    if (status.status === "completed") {
      const out: TItem[] = [];
      for (const page of status.data ?? []) {
        const payload =
          pickExtractPayload<TExtract>({ data: page }) ??
          page.extract ??
          page.json;
        const collection = payload?.[options.collectionKey];
        if (Array.isArray(collection)) {
          out.push(...(collection as TItem[]));
        }
      }
      return out;
    }
  }
  throw new FirecrawlTimeoutError(`/crawl/${jobId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}