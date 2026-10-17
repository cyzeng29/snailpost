# Snailpost — Build Log & Design Decisions

Local, versioned mirror of the Google Doc of the same name. The Google Doc is BLOCKED (see F). Once it exists, its id goes in `docs/build-log.config.json`.

## A. Current build

- **Last updated:** 2026-10-16 (milestone 1: references inspected, project scaffolded)
- **Branch:** `build/v1`
- **Start locally:** `npm install && npm run dev`, then open http://localhost:3000
- **Preview/deployment URL:** none yet. The Vercel project isn't connected.
- **Sender-to-recipient loop:** not yet built. The project is scaffolded and reference research is done.

## B. Capability inventory

Statuses: PLANNED / IN PROGRESS / IMPLEMENTED, UNVERIFIED / VERIFIED / BLOCKED. "Data" means whether a feature uses real services, local storage, or demo fixtures.

| Feature | User-facing behavior | Route/component | Status | Data | Evidence | Remaining work |
|---|---|---|---|---|---|---|
| Moment capture | Photo + caption, reorder/remove, ≤6 | `/today`, `MomentCapture` | PLANNED | local (IndexedDB) | — | all |
| Draft persistence | Survives refresh | `lib/store/local` | PLANNED | local (IndexedDB) | — | all |
| Compose | Moments → Note → Preview | `/postcards/[id]/edit` | PLANNED | local | — | all |
| Voice | Record ≤60 s, listen, re-record, remove, upload fallback | `VoiceRecorder` | PLANNED | local | — | all |
| Card flip | Front/back turn, labeled controls, reduced motion | `FlipCard` | PLANNED | — | — | all |
| Keepsakes cluster | Rest → browse → select → turn → return; list alternative | `/keepsakes`, `PostcardCluster` | PLANNED | local | — | all |
| Recipient page | Easy Reading, envelope, voice, letter view | `/p/[token]`, `/demo` | PLANNED | demo fixture | — | all |
| Cross-device publishing | Durable unlisted link | `/api/publish` | BLOCKED | Supabase (not configured) | — | Needs a Supabase project (the user will add one later) |
| Share | Share sheet + copy link | `ShareActions` | PLANNED | — | — | all |
| Print PDF | 2-page 6×4 in PDF | `PrintExport` | PLANNED | — | — | all |

## C. Design decisions

| Decision | Alternatives considered | Why chosen | Evidence or assumption |
|---|---|---|---|
| Local-first build; Supabase behind an adapter | Build the backend first; fake share URLs | The user asked to run locally first and add Supabase later. Fake share URLs would mislead | User decision, 2026-10-16 |
| Card turn built with CSS 3D transforms + Motion, not three.js | three.js as in ticket-card | A postcard only needs one axis of rotation. CSS keeps real DOM text, so it is selectable, screen-reader accessible, and never mirrored. A 3D engine isn't required (per the brief) | ticket-card source review (below) |
| No idle sway on the card | ticket-card's idle sway | The brief says there should be no movement while reading | Brief §4D |

### Reference inspection: what was observed vs. proposed

**Moodboard (`Untitled design.pdf`, 1 page): observed.**
- Red/orange envelopes covered in vintage stamps, with "please deliver to" lettering.
- A journal spread with a taped note reading "Let it be unpolished and messy and true", plus "Lucky to be here".
- Bold single-line spiral snails: one red on pink, one white inside a black perforated stamp, a blue "SLOW FOOTPRINT" oval stamp, and a large black brush spiral.
- Painted pink snails with patterned shells, a watercolor snail, and a small line-drawn snail.
- Type samples: TIERRA (geometric all-caps on moss green), "peach pit" (a quirky organic serif), and "pinefolk" (a soft rounded serif in rust on cream).
- A Pantone 18-1248 Rust swatch.

**What we take from it:**
- The spiral built from one continuous stroke.
- The perforated stamp edge.
- Rust and clay on cream; moss as the calm accent.
- Taped notes.

We do not trace the logos or the artwork.

**Ramp sketchbook post (`x.com/jeanxcrj/status/2064835647152787800`): NOT INSPECTED.**
- WebFetch returned HTTP 402 (X requires login), so no video was viewed.
- The flip motion below is our own proposal, informed by the brief's description and by the ticket-card code (which its author says was itself inspired by ramp.design).

**ticket-card (`github.com/ela1ne0/ticket-card`): inspected.** Read the README, LICENSE, `src/interactive.js`, `src/layout.js` and `src/ease.js`.

What it actually is:
- A single three.js card that you drag to spin with momentum, hover to scan, click to stamp, and flip with the Space key or a button.
- It is **not a cluster of cards.** The Snailpost keepsake cluster is an independent proposal.

Observed motion details:
- The flip slerps between orientations over 0.85 s with `easeInOutCubic`.
- During the flip the card lifts toward the viewer by `sin(π·t)`, peaking mid-turn.
- The drop shadow's opacity falls by about 35% and its scale grows by about 25% at the peak of the lift.
- There is a hover tilt that follows the pointer, and an idle sway when the card is at rest.

License:
- The code is MIT. The artwork in `public/assets/` is all rights reserved.
- **No code or art was copied.** Snailpost reimplements the lift-and-shadow idea in CSS/Motion using its own values (about 650 ms).

## D. Test evidence

| Date | Build | Command or manual procedure | Environment | Result/count | Failure or limitation | Evidence location |
|---|---|---|---|---|---|---|
| — | — | No tests run yet | — | — | — | — |

## E. What was created

- A Next.js 16.4.2 (App Router, TypeScript, Tailwind v4) scaffold on branch `build/v1`.
- Dependencies installed: motion, idb, pdf-lib, qrcode, @supabase/supabase-js, vitest, Testing Library, Playwright, axe-core.

## F. Known limitations and next steps

- Cross-device publishing is BLOCKED until a Supabase project is configured.
- The Ramp reference video has not been inspected (blocked by login).
- **Google Doc: BLOCKED.** The Drive `create_file` call on 2026-10-16 failed with "Insufficient scope": the connected Google Drive integration has read-only scope. To fix it, reconnect Google Drive with write (drive.file) scope, and enable the Google Docs connector for in-place updates.
- Out of scope for v1: translation, translated voice, scheduled delivery, physical mailing.
