import { describe, expect, it } from "vitest";
import {
  filterMergedForInventory,
  inventoryIdentity,
  keepInventoryRow,
  qualifiesAgentSandbox,
} from "./qualify.ts";
import type { SandboxProvider } from "@/schemas/provider";

describe("qualifiesAgentSandbox", () => {
  it("accepts known sandbox vendors", () => {
    expect(
      qualifiesAgentSandbox("E2B", "https://e2b.dev", {
        sources: ["firecrawl:manual"],
      }),
    ).toBe(true);
    expect(
      qualifiesAgentSandbox(
        "Daytona",
        "https://www.daytona.io/docs/en/sandboxes/",
        {
          sources: ["firecrawl:infraforagents"],
        },
      ),
    ).toBe(true);
  });

  it("rejects Boxyard template placeholder URLs", () => {
    expect(
      qualifiesAgentSandbox(
        "Agent Sandbox",
        "https://link-to-agent-sandbox.com",
        { sources: ["firecrawl:boxyard"] },
      ),
    ).toBe(false);
    expect(
      qualifiesAgentSandbox("Agent Sandbox", "https://agent.sandbox", {
        sources: ["firecrawl:boxyard"],
      }),
    ).toBe(false);
  });

  it("rejects catalogs and marketplaces", () => {
    expect(
      qualifiesAgentSandbox("Boxyard", "https://boxyard.dev/providers", {}),
    ).toBe(false);
    expect(
      qualifiesAgentSandbox(
        "Agents Sandboxes",
        "https://agentsandboxes.fyi",
        {},
      ),
    ).toBe(false);
    expect(
      qualifiesAgentSandbox(
        "PH Launch",
        "https://www.producthunt.com/posts/foo",
        {},
      ),
    ).toBe(false);
  });

  it("rejects underlying isolation docs", () => {
    expect(
      qualifiesAgentSandbox(
        "Firecracker",
        "https://github.com/firecracker-microvm/firecracker",
        {},
      ),
    ).toBe(false);
    expect(
      qualifiesAgentSandbox(
        "gVisor",
        "https://gvisor.dev/docs/architecture_guide/",
        {},
      ),
    ).toBe(false);
  });

  it("allows OSS agent sandbox GitHub repos", () => {
    expect(
      qualifiesAgentSandbox(
        "OpenSandbox Agent Runtime",
        "https://github.com/open-sandbox/open-sandbox",
        { sources: ["firecrawl:github-topic"] },
      ),
    ).toBe(true);
  });

  it("allows stealth/waitlist pages with sandbox signals", () => {
    expect(
      qualifiesAgentSandbox(
        "Stealth Agent Sandbox",
        "https://example.com/waitlist",
        {
          sources: ["firecrawl:search"],
          availability: "waitlist",
          offering_type: "stealth",
        },
      ),
    ).toBe(true);
  });

  it("allows YC company pages with sandbox signals or yc discovery source", () => {
    expect(
      qualifiesAgentSandbox(
        "CodeSandbox AI",
        "https://www.ycombinator.com/companies/codesandbox",
        { sources: ["firecrawl:yc-infra"] },
      ),
    ).toBe(true);
    expect(
      qualifiesAgentSandbox(
        "Random Co",
        "https://www.ycombinator.com/companies/random-co",
        {},
      ),
    ).toBe(false);
  });

  it("requires sandbox+agent signals for firecrawl list extractions", () => {
    expect(
      qualifiesAgentSandbox("Random Tool", "https://example.com/about", {
        sources: ["firecrawl:awesome-arjan"],
      }),
    ).toBe(false);
    expect(
      qualifiesAgentSandbox(
        "Modal Sandboxes",
        "https://modal.com/docs/guide/sandboxes",
        { sources: ["firecrawl:awesome-arjan"] },
      ),
    ).toBe(true);
  });
});

describe("keepInventoryRow", () => {
  it("keeps agentsandboxes.org vendor profiles", () => {
    expect(
      keepInventoryRow({
        name: "E2B",
        website: "https://e2b.dev",
        profile: "https://agentsandboxes.org/sandboxes/e2b/",
        sources: ["web"],
      }),
    ).toBe(true);
  });
});

describe("filterMergedForInventory", () => {
  const priorRow: SandboxProvider = {
    slug: "runloop",
    name: "Runloop",
    website: "https://runloop.ai",
    sources: ["InfraForAgents"],
  };
  const prior = inventoryIdentity([priorRow]);

  it("retains grandfathered rows that fail keepInventoryRow", () => {
    const { kept, droppedNew } = filterMergedForInventory([priorRow], prior);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.slug).toBe("runloop");
    expect(droppedNew).toBe(0);
  });

  it("prunes only new rows that fail keepInventoryRow", () => {
    const noise: SandboxProvider = {
      slug: "boxyard-catalog",
      name: "Boxyard",
      website: "https://boxyard.dev/providers",
      sources: ["firecrawl:manual"],
    };
    const { kept, droppedNew } = filterMergedForInventory(
      [priorRow, noise],
      prior,
    );
    expect(droppedNew).toBe(1);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.slug).toBe("runloop");
  });
});
