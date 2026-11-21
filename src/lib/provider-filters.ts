import type { SandboxProvider } from "@/types/provider";
import {
  isolationFilterGroupsFromProviders,
  normalizeIsolationFilterParam,
  providerMatchesIsolationGroup,
  type IsolationFilterGroupId,
} from "@/lib/isolation-filter-groups";

export type ProviderFilterState = {
  /** Isolation filter group id (see isolation-filter-groups.ts). */
  isolation: string;
};

export const EMPTY_FILTERS: ProviderFilterState = {
  isolation: "",
};

export function applyProviderFilters(
  list: SandboxProvider[],
  filters: ProviderFilterState,
): SandboxProvider[] {
  const groupId = normalizeIsolationFilterParam(filters.isolation);
  if (!groupId) return list;

  return list.filter((p) => providerMatchesIsolationGroup(p, groupId));
}

export function filterOptionsFromProviders(list: SandboxProvider[]): {
  isolation: IsolationFilterGroupId[];
} {
  return {
    isolation: isolationFilterGroupsFromProviders(list),
  };
}
