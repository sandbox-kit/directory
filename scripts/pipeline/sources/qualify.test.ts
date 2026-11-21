import { describe, expect, it } from "vitest";
import { qualifiesAsProviderSource, scoreSourceCandidate } from "./qualify.ts";

describe("source qualify", () => {
  it("prefers multi-provider directories over vendor homepages", () => {
    expect(
      qualifiesAsProviderSource({
        url: "https://boxyard.dev/providers",
        title: "Agent sandbox provider directory",
      }),
    ).toBe(true);
    expect(
      scoreSourceCandidate({
        url: "https://e2b.dev",
        title: "E2B — Code Interpreter",
      }),
    ).toBeLessThan(0.55);
  });
});
