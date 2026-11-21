import { z } from "zod";

/**
 * What environments / workloads a provider offers (not how they sell it).
 * Derived from public comparisons (E2B, Daytona, Modal, Fly, engine.build, agentsandboxes.org).
 */
export const SANDBOX_CAPABILITY_VALUES = [
  "linux",
  "windows",
  "macos",
  "browser",
  "desktop",
  "microvm",
  "container",
  "gvisor",
  "wasm",
  "ci",
  "gpu",
  "mobile",
  "edge",
] as const;

export const sandboxCapabilitySchema = z.enum(SANDBOX_CAPABILITY_VALUES);

export type SandboxCapability = z.infer<typeof sandboxCapabilitySchema>;

export const SANDBOX_CAPABILITY_LABELS: Record<SandboxCapability, string> = {
  linux: "Linux",
  windows: "Windows",
  macos: "macOS",
  browser: "Browser",
  desktop: "Desktop / computer-use",
  microvm: "MicroVM / hardware VM",
  container: "Container",
  gvisor: "gVisor / userspace kernel",
  wasm: "WebAssembly / isolate",
  ci: "CI / ephemeral runners",
  gpu: "GPU workloads",
  mobile: "Mobile devices",
  edge: "Edge / worker runtime",
};

/** Synonyms Firecrawl or legacy `isolation` text may emit → canonical tags. */
const ALIASES: ReadonlyArray<readonly [RegExp, SandboxCapability[]]> = [
  [/micro\s*vm|firecracker|kvm|cloud hypervisor|hardware.?virtual/i, ["microvm"]],
  [/gvisor|runsc|userspace kernel/i, ["gvisor"]],
  [/windows|hyper-?v.*windows|win\s*server/i, ["windows"]],
  [/mac\s*os|darwin|apple silicon|virtualization\.framework|tart|vz\b/i, [
    "macos",
  ]],
  [/headless chrome|playwright|puppeteer|browser sandbox|webkit/i, ["browser"]],
  [/vnc|novnc|computer.?use|remote desktop|\brdp\b|gui desktop/i, [
    "desktop",
    "browser",
  ]],
  [/wasm|webassembly|v8 isolate|deno deploy|workers isolate/i, ["wasm", "edge"]],
  [/github actions|gitlab ci|ci\/?cd|ephemeral runner|build agent/i, ["ci"]],
  [/nvidia|cuda|gpu|h100|a100|\bmi\d/i, ["gpu"]],
  [/android|ios|iphone|emulator farm|device farm/i, ["mobile"]],
  [/cloudflare workers|edge sandbox|worker isolate/i, ["edge"]],
  [/container|docker|oci|runc\b|namespaces/i, ["container", "linux"]],
  [/linux|ubuntu|debian|shell execution|code execution/i, ["linux"]],
  [/sandbox runtime/i, []],
];

export function normalizeSandboxCapabilities(
  raw: readonly string[] | undefined,
): SandboxCapability[] {
  if (!raw?.length) return [];
  const out = new Set<SandboxCapability>();
  for (const item of raw) {
    const token = item.trim().toLowerCase();
    if (!token) continue;
    const direct = SANDBOX_CAPABILITY_VALUES.find((c) => c === token);
    if (direct) {
      out.add(direct);
      continue;
    }
    for (const [pattern, tags] of ALIASES) {
      if (pattern.test(item)) {
        for (const t of tags) out.add(t);
      }
    }
  }
  return SANDBOX_CAPABILITY_VALUES.filter((c) => out.has(c));
}

export function mergeSandboxCapabilities(
  ...lists: ReadonlyArray<readonly SandboxCapability[] | undefined>
): SandboxCapability[] {
  const out = new Set<SandboxCapability>();
  for (const list of lists) {
    if (!list) continue;
    for (const c of list) out.add(c);
  }
  return SANDBOX_CAPABILITY_VALUES.filter((c) => out.has(c));
}