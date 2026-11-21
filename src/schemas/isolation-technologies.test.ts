import { describe, expect, it } from "vitest";
import {
  buildIsolationDisplay,
  normalizeIsolationTechnologies,
} from "@/schemas/isolation-technologies";

describe("isolation technologies", () => {
  it("maps gVisor phrases", () => {
    expect(normalizeIsolationTechnologies(["gVisor userspace kernel"])).toEqual(
      ["gvisor"],
    );
  });

  it("builds display without generic filler when specific exists", () => {
    const lines = buildIsolationDisplay(["gvisor"], ["Sandbox runtime"]);
    expect(lines).toContain("gVisor");
    expect(lines).not.toContain("Sandbox runtime");
  });
});
