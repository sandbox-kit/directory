import { describe, expect, it } from "vitest";
import { applyMetadataPatch } from "./merge-fields.ts";
import type { SandboxProvider } from "@/schemas/provider";

const row = (overrides: Partial<SandboxProvider>): SandboxProvider => ({
  slug: "x",
  name: "Legacy Name",
  website: "https://example.com",
  display_name: "Legacy Name",
  ...overrides,
});

describe("applyMetadataPatch", () => {
  it("updates name and matching display_name on discovery merge", () => {
    const prev = row({});
    applyMetadataPatch(prev, { name: "Current Product" }, "fill_unknown");
    expect(prev.name).toBe("Current Product");
    expect(prev.display_name).toBe("Current Product");
  });

  it("does not overwrite known offering_type in fill mode", () => {
    const prev = row({ offering_type: "hosted" });
    applyMetadataPatch(prev, { offering_type: "oss" }, "fill_unknown");
    expect(prev.offering_type).toBe("hosted");
  });
});
