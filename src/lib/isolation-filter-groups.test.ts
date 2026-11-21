import { describe, expect, it } from "vitest";
import {
  isolationFilterGroupsFromProviders,
  normalizeIsolationFilterParam,
  providerMatchesIsolationGroup,
} from "@/lib/isolation-filter-groups";
import type { SandboxProvider } from "@/types/provider";

const row = (over: Partial<SandboxProvider>): SandboxProvider => ({
  slug: "x",
  name: "X",
  website: "https://example.com",
  ...over,
});

describe("isolation filter groups", () => {
  it("maps legacy tech URL params to a group", () => {
    expect(normalizeIsolationFilterParam("firecracker")).toBe("microvm");
    expect(normalizeIsolationFilterParam("docker")).toBe("container");
    expect(normalizeIsolationFilterParam("remote_browser")).toBe("browser");
  });

  it("matches any technology in the group", () => {
    const firecracker = row({ isolation_technologies: ["firecracker"] });
    const kata = row({ slug: "k", isolation_technologies: ["kata"] });
    expect(providerMatchesIsolationGroup(firecracker, "microvm")).toBe(true);
    expect(providerMatchesIsolationGroup(kata, "microvm")).toBe(true);
    expect(providerMatchesIsolationGroup(firecracker, "container")).toBe(false);
  });

  it("dedupes groups for filter options", () => {
    const groups = isolationFilterGroupsFromProviders([
      row({ isolation_technologies: ["docker"] }),
      row({ slug: "b", isolation_technologies: ["runc"] }),
      row({ slug: "c", isolation_technologies: ["gvisor"] }),
    ]);
    expect(groups).toEqual(["container", "kernel"]);
  });
});
