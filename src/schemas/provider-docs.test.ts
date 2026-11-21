import { describe, expect, it } from "vitest";
import {
  inferDocsFromSources,
  mergeProviderDocs,
  providerHasPricingDoc,
} from "@/schemas/provider-docs";

describe("provider docs", () => {
  it("merges by URL and keeps longer description", () => {
    const merged = mergeProviderDocs(
      [{ description: "Pricing", link: "https://example.com/pricing" }],
      [
        {
          description: "Official pricing and plans",
          link: "https://example.com/pricing/",
        },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.description).toBe("Official pricing and plans");
  });

  it("infers pricing URLs from sources", () => {
    const docs = inferDocsFromSources(
      ["https://vendor.io/docs/sandboxes", "https://vendor.io/pricing", "yc"],
      "https://vendor.io",
    );
    expect(docs.some((d) => d.link.includes("/pricing"))).toBe(true);
    expect(providerHasPricingDoc(docs)).toBe(true);
  });
});
