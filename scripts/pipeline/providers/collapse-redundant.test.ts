import { describe, expect, it } from "vitest";
import {
  collapseProvidersByDisplayName,
  shouldMergeRedundantProvider,
} from "./collapse-redundant.ts";
import type { SandboxProvider } from "@/schemas/provider";

function row(
  partial: Partial<SandboxProvider> & Pick<SandboxProvider, "slug" | "name">,
): SandboxProvider {
  return {
    website: "https://example.com",
    ...partial,
  };
}

describe("shouldMergeRedundantProvider", () => {
  it("merges GitHub mirror into product site", () => {
    const primary = row({
      slug: "kubernetes-agent-sandbox",
      name: "Kubernetes Agent Sandbox",
      display_name: "Kubernetes Agent Sandbox",
      website: "https://agent-sandbox.sigs.k8s.io/",
      website_status: "ok",
      profile: "https://agentsandboxes.org/sandboxes/gke-agent-sandbox/",
      sources: [
        "curated",
        "curated",
        "curated",
        "curated",
        "curated",
        "curated",
      ],
    });
    const secondary = row({
      slug: "kubernetes-agent-sandbox-github",
      name: "Kubernetes Agent Sandbox",
      display_name: "Kubernetes Agent Sandbox",
      website: "https://github.com/kubernetes-sigs/agent-sandbox",
      website_status: "ok",
      sources: ["firecrawl:awesome-arjan", "firecrawl:awesome-fhiltscher"],
    });
    expect(shouldMergeRedundantProvider(secondary, primary)).toBe(true);
  });

  it("merges YC listing into product website", () => {
    const primary = row({
      slug: "agent-37",
      name: "Agent 37",
      display_name: "Agent 37",
      website: "https://www.agent37.com/cloud",
      website_status: "ok",
    });
    const secondary = row({
      slug: "agent-37-ycombinator",
      name: "Agent 37",
      display_name: "Agent 37",
      website: "https://www.ycombinator.com/companies/agent-37",
      website_status: "ok",
    });
    expect(shouldMergeRedundantProvider(secondary, primary)).toBe(true);
  });

  it("merges broken placeholder into working row", () => {
    const primary = row({
      slug: "agent-sandbox-agentsandbox",
      name: "Agent Sandbox",
      display_name: "Agent Sandbox",
      website: "https://www.agentsandbox.com",
      website_status: "ok",
      sources: ["firecrawl:boxyard"],
    });
    const secondary = row({
      slug: "agent-sandbox-agent",
      name: "Agent Sandbox",
      display_name: "Agent Sandbox",
      website: "https://agent.sandbox",
      website_status: "broken",
      sources: ["firecrawl:boxyard"],
    });
    expect(shouldMergeRedundantProvider(secondary, primary)).toBe(true);
  });
});

describe("collapseProvidersByDisplayName", () => {
  it("collapses github, yc, broken, and weaker catalog duplicates", () => {
    const { rows, collapsed } = collapseProvidersByDisplayName([
      row({
        slug: "kubernetes-agent-sandbox",
        name: "Kubernetes Agent Sandbox",
        display_name: "Kubernetes Agent Sandbox",
        website: "https://agent-sandbox.sigs.k8s.io/",
        website_status: "ok",
        profile: "https://agentsandboxes.org/sandboxes/gke-agent-sandbox/",
        sources: ["a", "b", "c", "d", "e", "f"],
      }),
      row({
        slug: "kubernetes-agent-sandbox-github",
        name: "Kubernetes Agent Sandbox",
        display_name: "Kubernetes Agent Sandbox",
        website: "https://github.com/kubernetes-sigs/agent-sandbox",
        website_status: "ok",
        sources: ["gh"],
      }),
      row({
        slug: "agent-sandbox-agentsandbox",
        name: "Agent Sandbox",
        display_name: "Agent Sandbox",
        website: "https://www.agentsandbox.com",
        website_status: "ok",
      }),
      row({
        slug: "agent-sandbox-link",
        name: "Agent Sandbox",
        display_name: "Agent Sandbox",
        website: "https://link-to-agent-sandbox.com",
        website_status: "broken",
      }),
      row({
        slug: "agentbay",
        name: "Alibaba Cloud Agent Sandbox",
        display_name: "Alibaba Cloud Agent Sandbox",
        website: "https://www.alibabacloud.com/en/product/agentbay",
        website_status: "ok",
        profile: "https://agentsandboxes.org/sandboxes/alibaba-agentbay/",
        sources: Array.from({ length: 10 }, (_, i) => `s${i}`),
      }),
      row({
        slug: "alibaba-cloud-agent-sandbox",
        name: "Alibaba Cloud Agent Sandbox",
        display_name: "Alibaba Cloud Agent Sandbox",
        website: "https://www.alibaba.com/cloud/agent-sandbox/overview.html",
        website_status: "redirect",
        sources: ["firecrawl:boxyard"],
      }),
    ]);

    expect(collapsed).toBeGreaterThanOrEqual(3);
    expect(rows.map((r) => r.slug).sort()).toEqual(
      [
        "agent-sandbox-agentsandbox",
        "agentbay",
        "kubernetes-agent-sandbox",
      ].sort(),
    );
    expect(
      rows.find((r) => r.slug === "kubernetes-agent-sandbox")?.sources,
    ).toEqual(expect.arrayContaining(["gh", "a"]));
  });
});
