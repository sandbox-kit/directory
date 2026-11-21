import { z } from "zod";
import type { SandboxCapability } from "@/schemas/sandbox-capabilities";

/**
 * How untrusted code is isolated (primitive / runtime boundary).
 * Distinct from `sandbox_capabilities` (what OS/workloads are offered).
 */
export const ISOLATION_TECHNOLOGY_VALUES = [
  "firecracker",
  "gvisor",
  "container",
  "docker",
  "kvm",
  "hyperv",
  "cloud_hypervisor",
  "kata",
  "webcontainers",
  "wasm_isolate",
  "browser_isolation",
  "apple_virtualization",
  "sysbox",
  "runc",
  "virtual_desktop",
  "remote_browser",
  "managed_runtime",
] as const;

export const isolationTechnologySchema = z.enum(ISOLATION_TECHNOLOGY_VALUES);

export type IsolationTechnology = z.infer<typeof isolationTechnologySchema>;

export const ISOLATION_TECHNOLOGY_LABELS: Record<IsolationTechnology, string> = {
  firecracker: "Firecracker microVM",
  gvisor: "gVisor",
  container: "Container sandbox",
  docker: "Docker containers",
  kvm: "KVM hardware VM",
  hyperv: "Hyper-V isolation",
  cloud_hypervisor: "Cloud Hypervisor",
  kata: "Kata containers",
  webcontainers: "WebContainers",
  wasm_isolate: "WASM / isolate runtime",
  browser_isolation: "Browser isolation",
  apple_virtualization: "Apple Virtualization.framework",
  sysbox: "Sysbox",
  runc: "runc container",
  virtual_desktop: "Virtual desktop",
  remote_browser: "Remote browser",
  managed_runtime: "Managed sandbox runtime",
};

const TECH_ALIASES: ReadonlyArray<readonly [RegExp, IsolationTechnology[]]> = [
  [/firecracker|micro\s*vm/i, ["firecracker", "kvm"]],
  [/gvisor|runsc|userspace kernel/i, ["gvisor"]],
  [/cloud hypervisor/i, ["cloud_hypervisor", "kvm"]],
  [/hyper-?v/i, ["hyperv"]],
  [/webcontainers/i, ["webcontainers", "wasm_isolate"]],
  [/docker|oci container/i, ["docker", "container"]],
  [/container sandbox|namespaces/i, ["container"]],
  [/kata/i, ["kata", "container"]],
  [/wasm|webassembly|v8 isolate/i, ["wasm_isolate"]],
  [/browser|playwright|headless chrome|remote browser/i, [
    "remote_browser",
    "browser_isolation",
  ]],
  [/virtual desktop|vnc|computer.?use|\brdp\b/i, ["virtual_desktop"]],
  [/virtualization\.framework|apple silicon|\bvz\b/i, ["apple_virtualization"]],
  [/sysbox/i, ["sysbox", "container"]],
  [/\brunc\b/i, ["runc", "container"]],
  [/persistent vm|hardware.?virtual|kvm/i, ["kvm"]],
  [/cloud.?managed|shared code runner|sandbox runtime|cloud sandbox api/i, [
    "managed_runtime",
  ]],
  [/self-hosted runtime|local isolation|dev container/i, ["container"]],
];

export function normalizeIsolationTechnologies(
  raw: readonly string[] | undefined,
): IsolationTechnology[] {
  if (!raw?.length) return [];
  const out = new Set<IsolationTechnology>();
  for (const item of raw) {
    const token = item.trim().toLowerCase();
    if (!token) continue;
    const direct = ISOLATION_TECHNOLOGY_VALUES.find(
      (id) => id === token || id.replace(/_/g, " ") === token,
    );
    if (direct) {
      out.add(direct);
      continue;
    }
    for (const [pattern, tags] of TECH_ALIASES) {
      if (pattern.test(item)) {
        for (const t of tags) out.add(t);
      }
    }
  }
  return ISOLATION_TECHNOLOGY_VALUES.filter((id) => out.has(id));
}

export function mergeIsolationTechnologies(
  ...lists: ReadonlyArray<readonly IsolationTechnology[] | undefined>
): IsolationTechnology[] {
  const out = new Set<IsolationTechnology>();
  for (const list of lists) {
    if (!list) continue;
    for (const id of list) out.add(id);
  }
  return ISOLATION_TECHNOLOGY_VALUES.filter((id) => out.has(id));
}

/** Infer isolation tech from capability tags when docs omit explicit primitive. */
export function isolationFromCapabilities(
  caps: readonly SandboxCapability[] | undefined,
): IsolationTechnology[] {
  if (!caps?.length) return [];
  const out = new Set<IsolationTechnology>();
  for (const c of caps) {
    switch (c) {
      case "microvm":
        out.add("firecracker");
        out.add("kvm");
        break;
      case "gvisor":
        out.add("gvisor");
        break;
      case "container":
        out.add("container");
        break;
      case "wasm":
        out.add("wasm_isolate");
        break;
      case "browser":
        out.add("remote_browser");
        out.add("browser_isolation");
        break;
      case "desktop":
        out.add("virtual_desktop");
        break;
      case "macos":
        out.add("apple_virtualization");
        break;
      case "windows":
        out.add("hyperv");
        break;
      case "edge":
        out.add("wasm_isolate");
        break;
      default:
        break;
    }
  }
  return ISOLATION_TECHNOLOGY_VALUES.filter((id) => out.has(id));
}

export function isolationLabelsFromTechnologies(
  techs: readonly IsolationTechnology[] | undefined,
): string[] {
  if (!techs?.length) return [];
  return techs.map((id) => ISOLATION_TECHNOLOGY_LABELS[id]);
}

/** Union structured labels + legacy free-text, dropping generic filler when specifics exist. */
export function buildIsolationDisplay(
  techs: readonly IsolationTechnology[] | undefined,
  legacy: readonly string[] | undefined,
): string[] {
  const structured = isolationLabelsFromTechnologies(techs);
  const fromLegacy = normalizeIsolationTechnologies(legacy);
  const legacyLabels = isolationLabelsFromTechnologies(fromLegacy);
  const combined = new Set([...structured, ...legacyLabels]);
  const hasSpecific = [...combined].some(
    (l) => l !== ISOLATION_TECHNOLOGY_LABELS.managed_runtime,
  );
  for (const line of legacy ?? []) {
    const t = line.trim();
    if (!t) continue;
    if (hasSpecific && t === "Sandbox runtime") continue;
    combined.add(t);
  }
  return [...combined];
}