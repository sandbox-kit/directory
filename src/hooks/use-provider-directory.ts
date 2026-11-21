import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { normalizeIsolationFilterParam } from "@/lib/isolation-filter-groups";
import {
  EMPTY_FILTERS,
  applyProviderFilters,
  filterOptionsFromProviders,
  type ProviderFilterState,
} from "@/lib/provider-filters";
import { filterProviders, sortProvidersByName } from "@/lib/search";
import type { SandboxProvider } from "@/types/provider";

function parseFilters(params: URLSearchParams): ProviderFilterState {
  const raw = params.get("isolation") ?? "";
  return {
    isolation: normalizeIsolationFilterParam(raw),
  };
}

function filtersToParams(
  filters: ProviderFilterState,
  query: string,
): URLSearchParams {
  const next = new URLSearchParams();
  const q = query.trim();
  if (q) next.set("q", q);
  if (filters.isolation) next.set("isolation", filters.isolation);
  return next;
}

export function useProviderDirectory(providers: SandboxProvider[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<ProviderFilterState>(() =>
    parseFilters(searchParams),
  );
  const deferredQuery = useDeferredValue(query);
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    const next = filtersToParams(deferredFilters, deferredQuery);
    const current = new URLSearchParams(searchParams);
    if (next.toString() === current.toString()) return;
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }, [deferredQuery, deferredFilters, searchParams, setSearchParams]);

  const filterOptions = useMemo(
    () => filterOptionsFromProviders(providers),
    [providers],
  );

  const results = useMemo(() => {
    const byText = filterProviders(providers, deferredQuery);
    const byFacet = applyProviderFilters(byText, deferredFilters);
    return sortProvidersByName(byFacet);
  }, [providers, deferredQuery, deferredFilters]);

  const resetFilters = () => setFilters(EMPTY_FILTERS);

  return {
    query,
    setQuery,
    filters,
    setFilters,
    resetFilters,
    filterOptions,
    hasIsolationFilter: Boolean(filters.isolation),
    results,
    total: providers.length,
  };
}
