import { describe, expect, it } from "vitest";
import { applyReconciliation } from "./reconcile.ts";
import { isListedProvider } from "./status.ts";

describe("provider verification", () => {
  it("drops pivoted and explicit non-sandbox reconciliations", () => {
    expect(
      isListedProvider({
        slug: "x",
        name: "X",
        website: "https://example.com",
        provider_status: "active",
      }),
    ).toBe(true);
    expect(
      isListedProvider({
        slug: "x",
        name: "X",
        website: "https://example.com",
        provider_status: "pivoted",
      }),
    ).toBe(false);
    expect(
      isListedProvider({
        slug: "x",
        name: "X",
        website: "https://example.com",
        reconciliation: { is_agent_sandbox: false },
      }),
    ).toBe(false);
  });

  it("corrects website when Firecrawl returns canonical URL", () => {
    const out = applyReconciliation(
      {
        slug: "modal",
        name: "Modal Sandboxes",
        website: "https://broken.modal.com/old",
        sources: ["firecrawl:test"],
      },
      {
        is_agent_sandbox: true,
        provider_status: "active",
        canonical_website: "https://modal.com/docs/guide/sandboxes",
        evidence: "Docs moved",
      },
    );
    expect(out.website).toBe("https://modal.com/docs/guide/sandboxes");
    expect(out.provider_status).toBe("active");
    expect(out.reconciliation?.corrected_from).toBe(
      "https://broken.modal.com/old",
    );
  });

  it("refreshes offering metadata when still an active sandbox", () => {
    const out = applyReconciliation(
      {
        slug: "x",
        name: "X",
        website: "https://example.com",
        offering_type: "stealth",
        availability: "waitlist",
        launch_stage: "alpha",
        display_name: "X",
      },
      {
        is_agent_sandbox: true,
        provider_status: "active",
        offering_type: "hosted",
        availability: "public",
        launch_stage: "ga",
      },
    );
    expect(out.offering_type).toBe("hosted");
    expect(out.availability).toBe("public");
    expect(out.launch_stage).toBe("ga");
  });
});
