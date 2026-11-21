import type { JsonSchema } from "../firecrawl/schemas.ts";

export const SOURCE_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          kind: {
            type: "string",
            description:
              "directory | integrations | blog | github | hackernews | docs | social | comparison",
          },
          likelyProviderCount: {
            type: "string",
            description:
              "low | medium | high — expected number of sandbox vendors on this page",
          },
          rationale: { type: "string" },
        },
        required: ["url", "title"],
      },
    },
  },
  required: ["sources"],
} as const satisfies JsonSchema;
