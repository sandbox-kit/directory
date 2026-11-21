import type { FirecrawlClient } from "./client.ts";
import type { JsonSchema } from "./schemas.ts";

export type ExtractFormatOptions<TField extends string> = {
  prompt: string;
  schema: JsonSchema;
  /** Key on the extract payload, e.g. `providers` or `sources`. */
  collectionKey: TField;
};

type ScrapeEnvelope<TExtract> = {
  data?: { extract?: TExtract; json?: TExtract };
  extract?: TExtract;
};

export function pickExtractPayload<T extends Record<string, unknown>>(
  body: ScrapeEnvelope<T>,
): T | undefined {
  return body.data?.extract ?? body.data?.json ?? body.extract;
}

export async function scrapeWithExtract<
  TExtract extends Record<string, unknown>,
  TCollectionKey extends keyof TExtract & string,
  TItem = TExtract[TCollectionKey] extends (infer U)[] | undefined ? U : never,
>(
  client: FirecrawlClient,
  url: string,
  options: ExtractFormatOptions<TCollectionKey>,
): Promise<TItem[]> {
  const body = await client.post<ScrapeEnvelope<TExtract>>("/scrape", {
    url,
    formats: ["extract"],
    extract: {
      prompt: options.prompt,
      schema: options.schema,
    },
  });
  const payload = pickExtractPayload(body);
  const collection = payload?.[options.collectionKey];
  return Array.isArray(collection) ? (collection as TItem[]) : [];
}