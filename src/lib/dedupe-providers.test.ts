import { describe, expect, it } from "vitest";
import {
  dedupeProvidersByHost,
  normalizeVendorLabel,
  providerHostKey,
  providerVendorKey,
} from "@/lib/dedupe-providers";
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

  it("scopes GitHub repos by org/repo", () => {
    const a = providerHostKey(
      base({ website: "https://github.com/org-a/sandbox-runtime" }),
    );
    const b = providerHostKey(
      base({ website: "https://github.com/org-b/microsandbox" }),
    );
    expect(a).toBe("github.com/org-a/sandbox-runtime");
    expect(b).toBe("github.com/org-b/microsandbox");
    expect(a).not.toBe(b);
  });

  it("merges sources when host keys collide", () => {
    const out = dedupeProvidersByHost([
      base({
        slug: "one",
        website: "https://www.example.com/foo",
        sources: ["a"],
      }),
      base({
        slug: "two",
        website: "https://example.com/bar",
        sources: ["b"],
        profile: "https://agentsandboxes.org/sandboxes/foo/",
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.sources).toEqual(expect.arrayContaining(["a", "b"]));
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

describe("providerVendorKey", () => {
  it("aligns Cloudflare subdomain rows", () => {
    expect(normalizeVendorLabel("Cloudflare Sandboxes")).toBe("cloudflare");
    const key = providerVendorKey(
      base({
        name: "Cloudflare Sandbox",
        website: "https://developers.cloudflare.com/sandbox",
      }),
    );
    expect(key).toBe("cloudflare.com|cloudflare");
  });

  it("skips GitHub repo rows", () => {
    expect(
      providerVendorKey(
        base({ website: "https://github.com/org-a/sandbox-runtime" }),
      ),
    ).toBeNull();
  });
});
