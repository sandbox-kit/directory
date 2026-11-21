import { describe, expect, it } from "vitest";
import {
  collapseProvidersByHost,
  collapseProvidersByVendorKey,
} from "./collapse-hosts.ts";

describe("collapseProvidersByHost", () => {
  it("merges rows that share a host after canonical URL alignment", () => {
    const { rows, collapsed } = collapseProvidersByHost([
      {
        slug: "old",
        name: "Old Brand",
        website: "https://vendor.io",
        sources: ["yc"],
        offering_type: "hosted",
      },
      {
        slug: "new",
        name: "Vendor",
        website: "https://www.vendor.io/product",
        sources: ["firecrawl:list"],
        profile: "https://agentsandboxes.org/sandboxes/vendor/",
        launch_stage: "ga",
      },
    ]);
    expect(collapsed).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sources).toEqual(
      expect.arrayContaining(["yc", "firecrawl:list"]),
    );
    expect(rows[0]?.launch_stage).toBe("ga");
  });
});

describe("collapseProvidersByVendorKey", () => {
  it("merges the same vendor on different subdomains", () => {
    const { rows, collapsed } = collapseProvidersByVendorKey([
      {
        slug: "cf-docs",
        name: "Cloudflare Sandbox",
        website: "https://developers.cloudflare.com/sandbox",
        profile: "https://agentsandboxes.org/sandboxes/cloudflare/",
        sources: ["curated"],
      },
      {
        slug: "cf-home",
        name: "Cloudflare Sandboxes",
        website: "https://sandbox.cloudflare.com",
        sources: ["InfraForAgents"],
      },
    ]);
    expect(collapsed).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sources).toEqual(
      expect.arrayContaining(["curated", "InfraForAgents"]),
    );
  });
});
