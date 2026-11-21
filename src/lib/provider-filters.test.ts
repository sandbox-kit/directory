import { describe, expect, it } from "vitest";
import { applyProviderFilters, EMPTY_FILTERS } from "@/lib/provider-filters";
import type { SandboxProvider } from "@/types/provider";

const row = (over: Partial<SandboxProvider>): SandboxProvider => ({
  slug: "x",
  name: "X",
  website: "https://example.com",
  ...over,
});

describe("applyProviderFilters", () => {
  it("filters by isolation technology", () => {
    const list = [
      row({ isolation_technologies: ["gvisor"] }),
      row({
        slug: "y",
        isolation_technologies: ["firecracker"],
      }),
    ];
    const out = applyProviderFilters(list, {
      ...EMPTY_FILTERS,
      isolation: "kernel",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe("x");
  });
});
