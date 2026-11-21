/** Minimal JSON Schema shape Firecrawl accepts for `extract.schema`. */
export type JsonSchema = {
  readonly type: "object";
  readonly properties: Record<string, unknown>;
  readonly required?: readonly string[];
};