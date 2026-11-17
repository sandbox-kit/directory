# sandbox.directory — development setup

This doc is for people hacking on the app and provider pipeline. End users only need [sandbox.directory](https://sandbox.directory) and the root [README.md](./README.md).

## Stack

React 19, React Router 7 (route loaders), Tailwind CSS 4 (`@tailwindcss/vite`), Vite 6, TypeScript (strict).

## App commands

```bash
npm install
npm run dev          # Zod-checks inventory, then Vite
npm run lint
npm run build
npm test
```

`npm run dev` and `npm run build` run `validate:providers` first (see below).

## Provider inventory

| Artifact                                                                     | Role                                      |
| ---------------------------------------------------------------------------- | ----------------------------------------- |
| [`public/agent-sandbox-providers.json`](public/agent-sandbox-providers.json) | **Canonical data** for the UI and scripts |

Regenerate and maintain:

```bash
python3 scripts/scrape_agentsandboxes.py   # cache under scripts/.agentsandboxes-scrape.json
python3 scripts/discover_providers.py      # merge discoveries → public/agent-sandbox-providers.json
python3 scripts/validate_websites.py        # HTTP-check, dedupe, logos, enrich
npm run resolve:logos                       # one logo_url per row (fast UI)
npm run audit:providers                     # drop non-sandboxes / bad URLs
python3 scripts/enrich_providers.py         # metadata refresh without re-crawling
npm run validate:providers                  # Zod gate (predev / prebuild)
npm run verify:names                        # title vs website audit
python3 scripts/verify_provider_names.py --fix   # apply curated name/slug fixes + enrich
```

Discovery pulls from agentsandboxes.org, [InfraForAgents](https://infraforagents.com/api/v1/products.json), [sandboxindex.dev](https://sandboxindex.dev), [LangChain sandbox integrations](https://docs.langchain.com/oss/python/integrations/sandboxes), Product Hunt, Y Combinator (Algolia), Hacker News Show HN, [agentsandboxes.fyi](https://agentsandboxes.fyi), [boxyard.dev](https://boxyard.dev), PyPI, crates.io, GitHub topics, awesome lists, roost.guide, npm, and GitHub search.

## Cursor agent skills

Project and community skills live under `.cursor/skills/` (synced via `npm run skills:sync`).

| Skill                                       | Focus                  |
| ------------------------------------------- | ---------------------- |
| `sandbox-directory-react`                   | This app’s conventions |
| `vercel-react-best-practices`               | React 19 performance   |
| `vercel-composition-patterns`               | Component composition  |
| `react-router`                              | React Router 7         |
| `tailwindcss`                               | Tailwind v4            |
| `vite` / `vitest`                           | Build and tests        |
| `web-design-guidelines` / `frontend-design` | UI review and design   |
| `accessibility` / `performance`             | Quality checks         |

Install more from [skills.sh](https://skills.sh/):

```bash
npx skills add <owner/repo@skill> -y --agent cursor --copy
npm run skills:sync
```

Find skills: `npx skills find <query>`.

## Key paths

| Area            | Location                  |
| --------------- | ------------------------- |
| Routes / pages  | `src/routes/`             |
| UI components   | `src/components/`         |
| Site constants  | `src/lib/site.ts`         |
| Zod schema      | `src/schemas/provider.ts` |
| Python pipeline | `scripts/`                |

Production site config: `SITE_ORIGIN` and GitHub URLs in `src/lib/site.ts`.

## Deploy (Vercel)

[`vercel.json`](./vercel.json) pins build/install commands, `dist` output, SPA rewrites, cache headers, and `www` → apex redirects so the Vercel dashboard can stay on defaults.

1. Import [github.com/sandbox-kit/directory](https://github.com/sandbox-kit/directory) in Vercel (Vite is auto-detected; the file overrides details).
2. **Production branch:** `main`.
3. **Domains:** add `sandbox.directory` and `www.sandbox.directory` (redirect is in `vercel.json` once both are assigned).

Local preview of the production build:

```bash
npm run build && npx vercel deploy --prebuilt
```
