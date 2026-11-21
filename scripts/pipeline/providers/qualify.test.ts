import { describe, expect, it } from "vitest";
import { keepInventoryRow, qualifiesAgentSandbox } from "./qualify.ts";

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
