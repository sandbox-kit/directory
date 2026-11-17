import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { filterProviders, sortProvidersByName } from "@/lib/search";
import type { SandboxProvider } from "@/types/provider";

export function useProviderSearch(providers: SandboxProvider[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const next = deferredQuery.trim();
    const current = searchParams.get("q") ?? "";
    if (next === current) return;
    if (next) {
      setSearchParams({ q: next }, { replace: true, preventScrollReset: true });
    } else {
      setSearchParams({}, { replace: true, preventScrollReset: true });
    }
  }, [deferredQuery, searchParams, setSearchParams]);

  const results = useMemo(() => {
    const filtered = filterProviders(providers, deferredQuery);
    return sortProvidersByName(filtered);
  }, [providers, deferredQuery]);

  return { query, setQuery, results, total: providers.length };
}
