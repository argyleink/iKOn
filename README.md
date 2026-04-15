# iKOn

Icon discovery by association. Search and browse icons across **Lucide**, **Phosphor**, and **Iconoir** with a shockwave interaction radiating from the center (on search) or from a clicked icon (on browse).

Named after the Teenage Engineering KO-II EP-133 screen aesthetic — dense grid, mono type, black/white.

## Stack

- **Next.js 16** (App Router) + **React 19** + **Turbopack**
- **TypeScript** strict, ES2022 target
- **Tailwind v4** for utilities + CSS Modules for component-scoped motion
- **Biome** — lint + format (`npm run lint`, `npm run lint:fix`, `npm run format`)
- **Vitest** + jsdom + Testing Library (`npm test`, `npm run test:run`)
- **Vercel** deploy target

## Commands

```bash
npm run build:icons   # rebuild public/icons.json from the installed packs
npm run dev           # start dev server
npm run typecheck     # tsc --noEmit
npm run test:run      # vitest once
```

`build:icons` runs automatically before `next build`.

## How the index works

`scripts/build-index.ts` walks three icon packages at build time:

| Pack     | Source                                   | Metadata                     |
| -------- | ---------------------------------------- | ---------------------------- |
| Lucide   | `lucide-static/icons/*.svg`              | `tags.json` (tag list)       |
| Phosphor | `@phosphor-icons/core/assets/regular`    | `icons` (categories + tags)  |
| Iconoir  | `iconoir/icons/regular/*.svg`            | name tokens only             |

For each icon it tokenizes the name and tags, then computes a neighbor score that blends:

- **name-token Jaccard** (weight 0.60)
- **tag Jaccard** (weight 0.25)
- **category Jaccard** (weight 0.15)
- small cross-pack bonus so similar icons mix across packs

Top 64 neighbors per icon are serialized into `public/icons.json` for O(1) browse-neighbor lookup at runtime.

Runtime search (`lib/search.ts`) is synchronous, in-memory, on top of an inverted-token index. For 4.4k icons this stays well under one frame — no worker, no IndexedDB.

## Interaction model

- **Centered search input** → results swap across the grid, radiating from the viewport center.
- **Click an icon (while not searching)** → swap to that icon's neighbors, radiating from the clicked cell. Click also copies the SVG and fires a toast arc'd alternately left/right from the cell.
- **Resize** → debounced (300ms, configurable) shockwave reflow from center.
- **Reduced motion** → cross-fade only, no transforms.

The swap itself is a pure CSS transition on `transform` (spring via `linear()`) + `opacity`, with per-cell `transition-delay` computed from radial distance to the origin. No WAAPI, no keyframes — fully interruptible.

## Structure

```
app/            # Next App Router (layout, page, globals.css)
components/     # Grid, Cell, SearchInput, Toast (each with a co-located .module.css)
lib/            # types, search, grid math, loader, tests
scripts/        # build-index.ts (offline neighbor computation)
public/
  icons.json    # generated — do not edit
```
