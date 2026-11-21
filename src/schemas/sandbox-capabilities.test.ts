import { describe, expect, it } from "vitest";
import {
  mergeSandboxCapabilities,
  normalizeSandboxCapabilities,
} from "@/schemas/sandbox-capabilities";

describe("normalizeSandboxCapabilities", () => {
  it("accepts canonical ids", () => {
    expect(normalizeSandboxCapabilities(["linux", "microvm"])).toEqual([
      "linux",
      "microvm",
    ]);
  });

  it("maps legacy isolation phrases", () => {
    expect(normalizeSandboxCapabilities(["Firecracker microVM"])).toEqual([
      "microvm",
    ]);
    expect(normalizeSandboxCapabilities(["gVisor userspace kernel"])).toEqual([
      "gvisor",
    ]);
  });
});

describe("mergeSandboxCapabilities", () => {
  it("dedupes in stable order", () => {
    expect(mergeSandboxCapabilities(["linux"], ["container", "linux"])).toEqual(
      ["linux", "container"],
    );
  });
});
