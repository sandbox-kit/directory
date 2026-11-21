import type { SandboxProvider } from "@/types/provider";
import {
  normalizeIsolationTechnologies,
  type IsolationTechnology,
} from "@/schemas/isolation-technologies";

/** UI filter buckets — several canonical tech IDs map to one tab. */
export const ISOLATION_FILTER_GROUPS = [
  {
    id: "microvm",
    label: "MicroVM",
    technologies: [
      "firecracker",
      "cloud_hypervisor",
      "kata",
    ] satisfies IsolationTechnology[],
  },
  {
    id: "container",
    label: "Container",
    technologies: [
      "container",
      "docker",
      "runc",
      "sysbox",
      "managed_runtime",
    ] satisfies IsolationTechnology[],
  },
  {
    id: "kernel",
    label: "gVisor",
    technologies: ["gvisor"] satisfies IsolationTechnology[],
  },
  {
    id: "vm",
    label: "VM",
    technologies: [
      "kvm",
      "hyperv",
      "apple_virtualization",
    ] satisfies IsolationTechnology[],
  },
  {
    id: "wasm",
    label: "WASM",
    technologies: [
      "wasm_isolate",
      "webcontainers",
    ] satisfies IsolationTechnology[],
  },
  {
    id: "browser",
    label: "Browser",
    technologies: [
      "browser_isolation",
      "remote_browser",
    ] satisfies IsolationTechnology[],
  },
  {
    id: "vdi",
    label: "VDI",
    technologies: ["virtual_desktop"] satisfies IsolationTechnology[],
  },
] as const;

export type IsolationFilterGroupId =
  (typeof ISOLATION_FILTER_GROUPS)[number]["id"];

const TECH_TO_GROUP = new Map<IsolationTechnology, IsolationFilterGroupId>();
for (const group of ISOLATION_FILTER_GROUPS) {
  for (const tech of group.technologies) {
    TECH_TO_GROUP.set(tech, group.id);
  }
}

export function isolationGroupForTechnology(
  tech: IsolationTechnology,
): IsolationFilterGroupId | undefined {
  return TECH_TO_GROUP.get(tech);
}

export function normalizeIsolationFilterParam(
  value: string,
): IsolationFilterGroupId | "" {
  if (!value) return "";
  const known = ISOLATION_FILTER_GROUPS.some((g) => g.id === value);
  if (known) return value as IsolationFilterGroupId;
  const asTech = value as IsolationTechnology;
  return isolationGroupForTechnology(asTech) ?? "";
}

export function providerIsolationTechnologies(
  p: SandboxProvider,
): Set<IsolationTechnology> {
  return new Set([
    ...(p.isolation_technologies ?? []),
    ...normalizeIsolationTechnologies(p.isolation),
  ]);
}

export function providerMatchesIsolationGroup(
  p: SandboxProvider,
  groupId: IsolationFilterGroupId,
): boolean {
  if (p.provider_status === "pivoted" || p.provider_status === "shutdown") {
    return false;
  }
  const group = ISOLATION_FILTER_GROUPS.find((g) => g.id === groupId);
  if (!group) return false;
  const tech = providerIsolationTechnologies(p);
  if (group.technologies.some((t) => tech.has(t))) return true;
  return false;
}

export function isolationFilterGroupsFromProviders(
  list: SandboxProvider[],
): IsolationFilterGroupId[] {
  const active = new Set<IsolationFilterGroupId>();
  for (const p of list) {
    if (p.provider_status === "pivoted" || p.provider_status === "shutdown") {
      continue;
    }
    for (const t of providerIsolationTechnologies(p)) {
      const group = TECH_TO_GROUP.get(t);
      if (group) active.add(group);
    }
  }
  const order = ISOLATION_FILTER_GROUPS.map((g) => g.id);
  return order.filter((id) => active.has(id));
}

export function isolationFilterGroupLabel(id: IsolationFilterGroupId): string {
  return ISOLATION_FILTER_GROUPS.find((g) => g.id === id)?.label ?? id;
}
