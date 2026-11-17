import { describe, expect, it } from "vitest";
import { displayDomain } from "@/lib/domain";
import { filterProviders, sortProvidersByName } from "@/lib/search";
import type { SandboxProvider } from "@/types/provider";

const sample = (overrides: Partial<SandboxProvider>): SandboxProvider => ({
  slug: "acme",
  name: "Acme Sandbox",
  website: "https://www.acme.example/sandbox",
  category_guess: "Cloud VM",
  ...overrides,
});

describe("filterProviders", () => {
  const list = [
    sample({ slug: "alpha", name: "Alpha", website: "https://alpha.test" }),
    sample({ slug: "beta", name: "Beta Browser", website: "https://beta.test", category_guess: "Browser" }),
  ];

  it("returns full list when query is empty", () => {
    expect(filterProviders(list, "")).toHaveLength(2);
    expect(filterProviders(list, "   ")).toHaveLength(2);
  });

  it("matches multi-token queries across fields", () => {
    expect(filterProviders(list, "beta browser")).toHaveLength(1);
    expect(filterProviders(list, "alpha cloud")).toHaveLength(1);
    expect(filterProviders(list, "gamma")).toHaveLength(0);
  });
});

describe("sortProvidersByName", () => {
  it("sorts case-insensitively by name", () => {
    const list = [
      sample({ name: "zebra" }),
      sample({ name: "alpha" }),
      sample({ name: "Beta" }),
    ];
    const names = sortProvidersByName(list).map((p) => p.name);
    expect(names).toEqual(["alpha", "Beta", "zebra"]);
  });
});

describe("displayDomain", () => {
  it("strips www and returns hostname", () => {
    expect(displayDomain("https://www.vendor.io/path")).toBe("vendor.io");
  });

  it("returns original string for invalid URLs", () => {
    expect(displayDomain("not-a-url")).toBe("not-a-url");
  });
});