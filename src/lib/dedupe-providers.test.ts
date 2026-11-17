import { describe, expect, it } from "vitest";
import { dedupeProvidersByHost, providerHostKey } from "@/lib/dedupe-providers";
import type { SandboxProvider } from "@/types/provider";

const base = (overrides: Partial<SandboxProvider>): SandboxProvider => ({
  slug: "a",
  name: "A",
  website: "https://example.com",
  ...overrides,
});

describe("dedupeProvidersByHost", () => {
  it("keeps one row per registrable host", () => {
    const list = [
      base({ slug: "one", website: "https://www.example.com/foo" }),
      base({
        slug: "two",
        website: "https://example.com/bar",
        profile: "https://agentsandboxes.org/sandboxes/foo/",
      }),
    ];
    const out = dedupeProvidersByHost(list);
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe("two");
  });

  it("uses redirect final_url for host key", () => {
    const key = providerHostKey(
      base({
        website: "https://old.example.net",
        website_check: { final_url: "https://vendor.io/" },
      }),
    );
    expect(key).toBe("vendor.io");
  });

  it("scopes AWS docs by product path", () => {
    const lambda = providerHostKey(
      base({
        website:
          "https://docs.aws.amazon.com/lambda/latest/dg/lambda-microvms-guide.html",
      }),
    );
    const nitro = providerHostKey(
      base({
        website:
          "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/amazon-ec2-nitro-sandboxes.html",
      }),
    );
    expect(lambda).toBe("docs.aws.amazon.com/lambda");
    expect(nitro).toBe("docs.aws.amazon.com/awsec2");
  });
});
