# sandbox.directory — development setup

This doc is for people hacking on the app and provider pipeline. End users only need [sandbox.directory](https://sandbox.directory) and the root [README.md](./README.md).

## Stack

React 19, React Router 7 (route loaders), Tailwind CSS 4 (`@tailwindcss/vite`), Vite 6, TypeScript (strict).

## App commands

```bash
npm install
npm run audit:providers   # dry-run keep/drop report
npm run dev          # Zod-checks inventory, then Vite
npm run lint
npm run build
npm test
```

`npm run dev` and `npm run build` run `validate:providers` first (see below).

## Provider inventory

| Artifact                                                                               | Role                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`public/agent-sandbox-providers.json`](public/agent-sandbox-providers.json)           | **Canonical data** for the UI                          |
| [`config/firecrawl-sources.json`](config/firecrawl-sources.json)                       | Active pages used to **extract vendors**               |
| [`config/source-discovery.json`](config/source-discovery.json)                         | Search queries + hub pages to **find new source URLs** |
| [`config/discovered-sources.json`](config/discovered-sources.json)                     | Registry of candidate source pages (scores, status)    |
| [`config/discovered-provider-mentions.json`](config/discovered-provider-mentions.json) | Vendors from HN/X/blogs (mention search deep extract)  |

Refresh locally:

```bash
cp .env.example .env   # FIRECRAWL_API_KEY required
npm run discover:sources   # find new list/index pages → may update firecrawl-sources.json
npm run sync:providers     # extract vendors into agent-sandbox-providers.json
```

Pipeline code lives under **`scripts/pipeline/`** (typed Firecrawl client, provider extract, source discovery).

**Discover sources** (`discover:sources`): Firecrawl **search** (HN, GitHub, blogs, directories, YC, …) + **hub extract** on meta-lists → scores candidates → auto-promotes high-confidence URLs into `firecrawl-sources.json`. Also runs **mention search** (`mentionSearchQueries` in `source-discovery.json`): top hits from HN launches, X/Twitter, and “we use E2B/Modal/…” blogs are scraped for named vendors → `discovered-provider-mentions.json`.

**Sync providers** (`sync:providers`): for each entry in `firecrawl-sources.json`, Firecrawl **scrape** or **crawl** + extract `providers[]`, **plus** merged rows from `discovered-provider-mentions.json` → qualify vendors, write inventory. Run `discover:sources` before sync in CI so mentions are fresh.

Extraction includes **hosted, OSS/self-hosted, hybrid, stealth/waitlist** sandboxes. Optional fields: `offering_type`, `availability`, `launch_stage`, `sandbox_capabilities`, `isolation_technologies`, `isolation` (display labels), `logo_url`, `docs` (`{ description, link }[]` for docs entry, pricing, API). Taxonomies: `config/capability-taxonomy.md`, `config/isolation-taxonomy.md`, `config/provider-docs.md`. Filtering in `scripts/pipeline/providers/qualify.ts` still drops catalogs and bare runtime docs.

**Verification** (every `sync:providers`): HTTP check all URLs; Firecrawl reconcile (broken URLs, host redirects, stale rows, new domains) to fix `website`, confirm still an agent sandbox, refresh `offering_type` / `availability` / `launch_stage` when still active, and drop `pivoted` / `shutdown` entries. After verify, **collapse** merges rows that now share the same host (rebrand / canonical URL). Limits in `config/verify-providers.json`.

### Scheduled sync (no backend)

[`.github/workflows/sync-providers.yml`](./.github/workflows/sync-providers.yml) runs **daily** at **11:00 IST** (05:30 UTC, `cron: 30 5 * * *`) and on **`workflow_dispatch`**. Set repository secret **`FIRECRAWL_API_KEY`**. The job runs `discover:sources` → `sync:providers` → `validate:providers`, then **opens a PR** on branch `chore/data-sync-providers` (updates the same PR if one is still open). It does **not** merge to `main`; you review and merge manually. If nothing changed, no PR is created.

## Key paths

| Area           | Location                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Routes / pages | `src/routes/`                                                                                                                  |
| UI components  | `src/components/`                                                                                                              |
| Site constants | `src/lib/site.ts`                                                                                                              |
| Zod schema     | `src/schemas/provider.ts`                                                                                                      |
| Sync pipeline  | `scripts/discover-sources.ts`, `scripts/sync-providers.ts`, `scripts/pipeline/` (imports use `@/` via `tsconfig.scripts.json`) |

Production site config: `SITE_ORIGIN` and GitHub URLs in `src/lib/site.ts`.

## Deploy (Vercel)

[`vercel.json`](./vercel.json) pins build/install commands, `dist` output, SPA rewrites, cache headers, and apex → `www` redirects so the Vercel dashboard can stay on defaults.

1. Import [github.com/sandbox-kit/directory](https://github.com/sandbox-kit/directory) in Vercel (Vite is auto-detected; the file overrides details).
2. **Production branch:** `main`.
3. **Domains:** add `www.sandbox.directory` (primary) and `sandbox.directory` (apex → `www` redirect in `vercel.json` once both are assigned).

Local preview of the production build:

```bash
npm run build && npx vercel deploy --prebuilt
```
