---
name: sandbox-directory-react
description: >-
  Builds and maintains the sandbox-directory Vite + React 19 + React Router 7 +
  Tailwind 4 directory UI. Use when editing src/, adding routes, components,
  data loading, or styling the agent sandbox directory app.
---

# Sandbox directory (React)

## Stack (stable current)

- **React 19** with Strict Mode
- **React Router 7** data APIs: `createBrowserRouter`, route `loader`, `errorElement`, `useLoaderData`
- **Tailwind CSS v4** via `@tailwindcss/vite` (no legacy `tailwind.config.js`)
- **Vite 6** + TypeScript strict + ESLint flat config

## Data

- Canonical inventory: `public/agent-sandbox-providers.json`
- Firecrawl pipeline: `npm run discover:sources` → `npm run sync:providers`; code in `scripts/pipeline/`
- App loads via `fetch("/agent-sandbox-providers.json")` — served by Vite from `public/`
- Do **not** import the full JSON into the client bundle

## Architecture

```
src/
  router.tsx          # route table
  routes/home.tsx     # page + loader co-located
  hooks/              # stateful UI logic (e.g. use-provider-search)
  components/         # presentational, kebab-case filenames
  lib/                # pure functions (search, fetch, domain)
  types/              # shared TS types
```

## React / Router practices

1. **Loaders for data** — async fetch in route `loader`; components use `useLoaderData()`.
2. **No barrel re-exports** — import from the defining module (smaller bundles).
3. **`useDeferredValue` + `useMemo`** for search filtering (keep input responsive).
4. **`memo`** on list row components when rendering hundreds of items.
5. **`content-visibility: auto`** on long lists.
6. **Accessible search** — `<label className="sr-only">`, `aria-live` on result counts, visible `:focus-visible` on links.
7. **Prefer ternary** over `&&` for conditional UI when the left-hand side can be `0`.
8. **Co-locate** route loader with the page component in `routes/`.

## Tailwind practices

1. Use Tailwind v4 `@import "tailwindcss"` in `src/index.css`.
2. Prefer utility classes; extract repeated patterns only when used 3+ times.
3. Respect `prefers-reduced-motion` for transitions (see `index.css`).
4. Dark zinc palette matches cursor.directory-style directory (minimal chrome).

## Related skills (Cursor, `.cursor/skills/`)

| Skill                           | Use for                            |
| ------------------------------- | ---------------------------------- |
| `vercel-react-best-practices`   | React 19 perf, bundles, re-renders |
| `vercel-composition-patterns`   | Component API design               |
| `react-router`                  | Loaders, RR7 patterns              |
| `tailwindcss`                   | Tailwind v4                        |
| `typescript-best-practices`     | Strict TS                          |
| `vite` / `vitest`               | Vite build / tests                 |
| `web-design-guidelines`         | UI / a11y checklist                |
| `frontend-design`               | Visual polish                      |
| `accessibility` / `performance` | Web quality audits                 |

## Commands

```bash
npm run validate:providers   # Zod-check public/agent-sandbox-providers.json
npm run dev
npm run lint
npm run build
```

After updating inventory, run `npm run validate:providers` (or `npm run dev`, which runs it on predev).
