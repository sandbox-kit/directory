import { useLoaderData } from "react-router-dom";
import { IsolationFilter } from "@/components/isolation-filter";
import { FeaturedProjects } from "@/components/featured-projects";
import { SearchBar } from "@/components/search-bar";
import { ProviderRow } from "@/components/provider-row";
import { SiteHeader } from "@/components/site-header";
import { useProviderDirectory } from "@/hooks/use-provider-directory";
import type { HomeLoaderData } from "@/routes/home.loader";
import { SiteFooter } from "@/components/site-footer";

export function HomePage() {
  const providers = useLoaderData() as HomeLoaderData;
  const {
    query,
    setQuery,
    filters,
    setFilters,
    filterOptions,
    hasIsolationFilter,
    results,
    total,
  } = useProviderDirectory(providers);
  const searchId = "provider-search";

  return (
    <div className="flex min-h-screen flex-col bg-sk-bg pt-14 md:pt-[60px]">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-lg bg-sk-fg px-4 py-2 text-sm font-medium text-sk-bg focus:outline-none focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-[60] focus-visible:ring-2 focus-visible:ring-sk-fg/40"
      >
        Skip to main content
      </a>

      <SiteHeader />

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-12 md:pt-14">
        <header className="mb-9 text-center sm:mb-12 md:mb-14">
          <h1
            className="animate-hero-rise text-[clamp(2.125rem,6.5vw,3.875rem)] font-[560] leading-[1.06] tracking-[-0.048em] text-balance text-sk-fg [font-variation-settings:'wght'_560]"
            style={{ animationDelay: "0ms" }}
          >
            Discover Sandbox
          </h1>
          <p
            className="animate-hero-rise mx-auto mt-3.5 max-w-lg text-[0.875rem] font-[450] leading-relaxed tracking-[-0.02em] text-sk-muted sm:mt-4"
            style={{ animationDelay: "0.12s" }}
          >
            <span className="block sm:inline">
              <span className="font-mono text-[0.8125rem] tabular-nums tracking-[-0.03em] text-sk-fg/90">
                {total}
              </span>{" "}
              providers
            </span>
            <span
              className="mx-1.5 hidden text-sk-muted-2 sm:inline"
              aria-hidden
            >
              ·
            </span>
            <span className="mt-0.5 block sm:mt-0 sm:inline">
              Search by name or domain
            </span>
          </p>
          <div className="mx-auto mt-7 flex w-full max-w-2xl flex-col items-stretch sm:mt-8 md:mt-9">
            <SearchBar
              inputId={searchId}
              value={query}
              onChange={setQuery}
              resultCount={results.length}
              totalCount={total}
            />
            <FeaturedProjects />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="outline-none">
          {filterOptions.isolation.length > 0 ? (
            <IsolationFilter
              value={filters.isolation}
              options={filterOptions.isolation}
              onChange={(isolation) => setFilters({ isolation })}
            />
          ) : null}
          {results.length === 0 ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-dashed border-sk-border py-16 text-center text-[0.9375rem] font-[450] leading-relaxed tracking-[-0.01em] text-sk-muted"
            >
              {query || hasIsolationFilter ? (
                <>No providers match your search or filter.</>
              ) : (
                <>No providers in the inventory.</>
              )}
            </div>
          ) : (
            <ol aria-label="Sandbox providers">
              {results.map((provider, i) => (
                <ProviderRow
                  key={`${provider.slug}:${provider.website}`}
                  provider={provider}
                  index={i}
                />
              ))}
            </ol>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
