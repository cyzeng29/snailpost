# snailpost

**A day in my life, as a postcard.** Little moments. A little closer.

During the day you collect one to six moments (a photo and a line each). In the evening you arrange them into a postcard, add a short note and optionally your voice, and choose a stamp. You can send it as a link through whatever messaging app your family already uses, or print it as a 6 × 4 in keepsake.

**Status:** the full creation, preview, keepsake and print experience works locally, and a fictional sample (`/demo`) shows the recipient experience end to end. Sending a *personal* postcard to another device needs a Supabase project. That path is written but **BLOCKED** until one is configured (see [docs/supabase-setup.md](docs/supabase-setup.md)). Until then the app says plainly that links aren't switched on and never invents a link.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Requires Node 22 or newer and npm. No environment variables are needed for the local experience.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npx next start` | Production build and server |
| `npm run lint` | ESLint (Next.js + React Compiler rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit and integration tests (layout engine, store, PDF, validation, cluster state, FlipCard) |
| `npx playwright install chromium webkit` | Install the browsers once |
| `npm run e2e` | Playwright end-to-end tests against a production build in Chromium desktop, Chromium mobile (Pixel 7) and WebKit mobile (iPhone 14) |
| `npx tsx scripts/evidence.mts` | Re-capture the visual checks into `docs/evidence` (server on :3100) |
| `npx tsx scripts/export-sample-pdf.mts <dir>` | Export the sample PDF and per-page PNGs for inspection |
| `npm run brand` | Regenerate the SVG brand files from `src/lib/brand.ts` |

## Routes

| Route | |
|---|---|
| `/today` | Collect today's moments (the app opens here) |
| `/postcards/[id]/edit` | Compose: Moments → Your note (voice, stamp) → Preview |
| `/postcards/[id]/preview` | The card turn, the letter view, "Ready to share", sharing and print |
| `/keepsakes` | The postcard pile (rest → browse → select → turn → return) or a plain list |
| `/settings` | Postcard Studio or Easy Reading, and text size |
| `/demo` | The clearly labeled fictional sample, as a recipient sees it |
| `/p/[token]` | A shared postcard (needs the publishing backend) |

## Where things live

- `src/lib/model.ts` is the one content model shared by the card faces, the letter view, the recipient page and the PDF.
- `src/lib/store/local.ts` holds drafts, photos and voice notes in IndexedDB, plus the frozen "ready" snapshots.
- `src/lib/layout.ts` is the deterministic layout engine (hero, pair, trio, grid, sequence).
- `src/lib/pdf.ts` is the static print path: pdf-lib, embedded fonts, vector type.
- `src/lib/publish/*`, `src/app/api/*` and `supabase/migrations` make up the publishing backend (BLOCKED).
- `src/components/postcard/FlipCard.tsx` is the card turn, and `src/components/keepsakes/*` the pile.

## Documentation

- [docs/build-log.md](docs/build-log.md): build log, capability inventory, design decisions and test evidence
- [docs/demo-script.md](docs/demo-script.md): the 6:45 competition presentation
- [docs/assets.md](docs/assets.md): asset provenance and font licenses
- [docs/supabase-setup.md](docs/supabase-setup.md): turning on cross-device links
- [docs/deploy.md](docs/deploy.md): deploying to Vercel
