import { useLoaderData } from "react-router-dom";
import { SearchBar } from "@/components/search-bar";
import { ProviderRow } from "@/components/provider-row";
import { SiteHeader } from "@/components/site-header";
import { useProviderSearch } from "@/hooks/use-provider-search";
import type { HomeLoaderData } from "@/routes/home.loader";
import { SiteFooter } from "@/components/site-footer";

export function HomePage() {
  const providers = useLoaderData() as HomeLoaderData;
  const { query, setQuery, results, total } = useProviderSearch(providers);
  const searchId = "provider-search";

  return (
    <div className="flex min-h-screen flex-col bg-sk-bg pt-14 md:pt-[60px]">
      <SiteHeader />

      <a
        href="#main-content"
        className="sr-only rounded-lg bg-sk-fg px-4 py-2 text-sm font-medium text-sk-bg focus:outline-none focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-16 focus-visible:z-50 focus-visible:ring-2 focus-visible:ring-sk-fg/40"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-10 sm:px-6 sm:pt-14">
        <header className="mb-11 text-center sm:mb-14">
          <h1
            className="animate-hero-rise mx-auto max-w-[14ch] text-[clamp(2.5rem,7.5vw,3.875rem)] font-[560] leading-[1.04] tracking-[-0.048em] text-balance text-sk-fg [font-variation-settings:'wght'_560] sm:max-w-none"
            style={{ animationDelay: "0ms" }}
          >
            Discover Sandbox
          </h1>
          <p
            className="animate-hero-rise mx-auto mt-4 max-w-[32ch] text-[0.875rem] font-[450] leading-snug tracking-[-0.02em] text-sk-muted sm:mt-5"
            style={{ animationDelay: "0.12s" }}
          >
            <span className="font-mono text-[0.8125rem] tabular-nums tracking-[-0.03em] text-sk-muted-2">
              {total}
            </span>{" "}
            providers · Search by name or domain
          </p>
          <div className="mt-8 flex justify-center sm:mt-9">
            <SearchBar
              inputId={searchId}
              value={query}
              onChange={setQuery}
              resultCount={results.length}
              totalCount={total}
            />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="outline-none">
          {results.length === 0 ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-dashed border-sk-border py-16 text-center text-[0.9375rem] font-[450] leading-relaxed tracking-[-0.01em] text-sk-muted"
            >
              {query ? (
                <>No providers match &ldquo;{query}&rdquo;.</>
              ) : (
                <>No providers in the inventory.</>
              )}
            </div>
          ) : (
            <ol
              className="border-t border-sk-border"
              aria-label="Sandbox providers"
            >
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
