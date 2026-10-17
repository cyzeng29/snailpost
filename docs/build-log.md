# Snailpost — Build Log & Design Decisions

This is the local, versioned record. The Google Doc of the same name is a snapshot copy of it (link in `docs/build-log.config.json`). If the two differ, this file is the current one. This log keeps two things apart: what is *intended* (PLANNED, BLOCKED) and what *works*, which is IMPLEMENTED and then VERIFIED once tests pass.

## A. Current build

- **Last updated:** 2026-10-16, evening (America/New_York)
- **Build:** merged into `main` and pushed to GitHub (`cyzeng29/snailpost`). Tests below were run on commit `9b24a3d`; later commits changed documentation only.
- **Start locally:** `npm install && npm run dev`, then open http://localhost:3000. Node 22+, no environment variables needed.
- **Preview/deployment URL:** none. Vercel isn't connected yet; steps are in `docs/deploy.md`.
- **Sender-to-recipient loop:** a sender can collect, compose, record, preview, freeze, print and keep postcards on one device, and the recipient experience works end to end with the bundled sample. Opening a *personal* postcard on another device is BLOCKED until a Supabase project is configured.

## B. Capability inventory

Data source: **local** = IndexedDB on this device, **fixture** = bundled sample or test fixture, **real service** = Supabase.

| Feature | User-facing behavior | Route/component | Status | Data | Evidence | Remaining work |
|---|---|---|---|---|---|---|
| Collect moments | Camera or library, caption, up to 6, honest "Getting your photo ready…" and "Saving on this device…" | `/today`, `AddMomentDialog` | VERIFIED | local | e2e `creation.spec` (3 browsers) | Real-device camera capture not tested |
| Photo intake | Resize to 2400 px, EXIF/GPS stripped by re-encoding, orientation respected; clear errors for corrupt, unsupported, oversized and HEIC files | `lib/media.ts` | VERIFIED (errors); IMPLEMENTED, UNVERIFIED (HEIC on a real iPhone, EXIF orientation on real photos) | local | unit `model.test`; e2e corrupt/unsupported/31 MB | Test real HEIC and rotated phone photos |
| Reorder / remove / replace | Move up/down buttons, optional drag handle, remove with Undo, replace photo | `MomentList` | VERIFIED (buttons, undo); IMPLEMENTED, UNVERIFIED (drag) | local | e2e reorder + undo | Drag not automated |
| Draft persistence | Survives refresh, with "Saved for later, on this device" | `lib/store/local.ts`, `useDraft` | VERIFIED | local | e2e add-4 → reorder → remove → refresh; unit `store.test` | — |
| Compose | Moments → Your note → Preview; 280-character note; title suggested from the count only | `/postcards/[id]/edit` | VERIFIED | local | e2e; screenshots | — |
| Layout engine | Hero (1), pair, trio, grid (4), sequence (5–6); stable tilts | `lib/layout.ts` | VERIFIED | — | unit `model.test`; e2e single-photo hero | — |
| Voice | Record ≤60 s, Stop, Listen back, Record again, Remove; MIME negotiation; mic denial; audio upload | `VoiceRecorder` | VERIFIED (Chromium fake mic, denial, upload); UNVERIFIED (real devices, iOS codecs) | local, fixture | e2e voice tests | Real iPhone/Android microphone |
| Written version | Transcript vs written summary, labeled honestly | `VoiceRecorder`, `LetterView` | VERIFIED | local | e2e letter view | No transcription service (by design) |
| Card turn | ~650 ms lift, pivot, traveling shadow, sheen; labeled buttons, tap, keyboard; inert hidden face; reduced motion | `FlipCard` | VERIFIED | — | e2e: pointer, keyboard, 25-tab focus walk, unmirrored transform, reduced motion; unit `flipcard.test` | Manual screen-reader pass |
| Letter view | All content in document flow, moments in order | `LetterView` | VERIFIED | — | e2e caption order | — |
| Freeze ("Ready to share") | Exact version saved; later edits flagged with "Get the new version ready" | `PreviewClient`, `createSnapshot` | VERIFIED | local | unit snapshot immutability; e2e frozen version + double-tap gives one version | — |
| Keepsakes pile | Rest → browse → select → turn → return; Previous/Next never turns the card; focus restored; Escape | `PostcardCluster`, `clusterState.ts` | VERIFIED | local, fixture | unit `cluster.test` (7); e2e keyboard, rapid taps, resize, Next-not-flip | Real touch device |
| Keepsakes list | Plain list with the same actions; delete with confirmation | `/keepsakes` | VERIFIED | local | e2e list + axe, delete confirm/cancel | — |
| Recipient page | Envelope once, Easy Reading by default, voice never autoplays, larger text, look switch, print | `RecipientView`, `/demo` | VERIFIED (sample) | fixture | e2e `postcard.spec`; screenshots | Real shared link: BLOCKED |
| Audio failure | "The voice note isn't loading. You can still read the postcard." | `VoicePlayer` | VERIFIED | fixture | e2e (404 route) | — |
| Cross-device publishing | Durable unlisted link, sender ownership, hashed token, signed media, revoke | `/api/publish`, `/api/links/revoke`, `/p/[token]`, `supabase/migrations` | **BLOCKED** | real service (not configured) | unit: token entropy, hashing, server validation; e2e: unknown link page + headers | Configure Supabase, run `publish.spec.ts` |
| Share | Native share sheet when available, visible Copy link, cancel is normal, never "delivered" | `ShareActions` | VERIFIED (emulated) | fixture (sample URL) | e2e cancel/success stubs, no-share fallback, clipboard success (Chromium) and failure | Real iOS/Android share sheet |
| Print PDF | Two 6 × 4 in pages, embedded fonts, vector type, continuation page for long notes, low-resolution notice | `lib/pdf.ts`, `PrintButton` | VERIFIED | — | unit `pdf.test` (6); e2e download → 2 pages 432 × 288 pt; page images inspected | Real printer duplex check |
| QR on print | Only for a real https link and only with voice; "Scan to hear my day." | `lib/pdf.ts` | VERIFIED (generation + decode); BLOCKED (no real link) | — | unit: decodes to the exact URL; localhost refused | — |
| Two appearances + text size | Postcard Studio / Easy Reading; larger text; persists | `AppearanceProvider`, `/settings` | VERIFIED | per-viewer localStorage | e2e larger text + reflow; screenshots | — |
| Private-link headers | `no-store`, `noindex`, `no-referrer`, generic link preview | `next.config.ts`, `/p/[token]` | VERIFIED | — | e2e response headers, no `og:image` | — |
| Google Doc build log | Snapshot copy of this log | `docs/build-log.config.json` | IMPLEMENTED (snapshot) | real service (Google Drive) | Doc created and read back | The connector can create Docs but not edit them, so each update means a fresh copy |
| Vercel preview | — | — | **BLOCKED** | — | — | Connect the repo (docs/deploy.md) |

## C. Design decisions

| Decision | Alternatives considered | Why chosen | Evidence or assumption |
|---|---|---|---|
| One small postcard a day, not a feed | Feed, stories, a shared album | A feed asks for performance and replies; one bounded object can be finished, sent and kept. No streaks, counts or reminders. | Assumption from the brief's job-to-be-done; to be piloted |
| Playful to make, calm to read | Separate apps; one middle-ground style | Same content and components, two token sets (`[data-appearance]`). Shared links default to Easy Reading (19 px, 48 px targets), and either side can switch. | Contrast checks: ink/paper 12.9, moss/paper 7.63, clay/paper 4.83; clay on peach fails (3.39), so text on peach is always ink |
| Real photos plus original decoration, never AI-redrawn | AI illustration of photos | The point is recognizing the sender's actual day; redrawing would put words in their mouth | Brief; nothing in the app claims AI processing |
| Voice optional, text always readable | Voice-first; automatic transcription | Not everyone can or wants to listen. "Transcript" is reserved for word-for-word text; otherwise it's labeled a summary. | Brief; no transcription service is configured |
| Link access, no recipient account | Recipient sign-up; in-app messaging | Recipients use the apps they already use; sign-up walls lose exactly this audience | Brief audience hypothesis |
| Print keepsake + QR bridge | Ordering physical mail | Print is in scope today; QR only for a real public link with voice, never localhost | Unit tests decode the QR |
| Tactile animation vs accessibility | three.js canvas (as in ticket-card); stock hover flip | CSS 3D keeps real, unmirrored DOM text; the hidden face is inert; labeled buttons; reduced-motion fade; letter view | e2e focus walk, unmirrored transform, reduced motion |
| A pile, not a grid; the list for calm reading | Grid; carousel only | A pile makes days feel kept. On phones, browsing turns each card into a full labeled target; there's a List view; Previous/Next is kept apart from turning. | First pile hid the cards underneath (`docs/evidence/exploration/pile-v1-cards-hidden.jpg`), so the fan was widened |
| Freeze on "Ready to share" | Live-linked drafts | A later edit must never silently change what someone already received | Unit + e2e |
| Store media as ArrayBuffer in IndexedDB | Blob in IndexedDB | WebKit rejects Blobs in ephemeral sessions (Safari private mode): "Error preparing Blob/File data" | WebKit probe; 8 WebKit e2e failures fixed by this |
| Embed the handwriting font whole in PDFs | Subset all fonts | Subsetting the variable Caveat font dropped glyphs ("Love, Alex" printed as "A") | Visual PDF inspection; regression test fails without the fix |
| Snail mark: envelope shell with a spiral wax seal | Spiral drawn over the flap (v1) | The spiral tangled with the flap lines and muddied at small sizes | `exploration/mark-v1-and-stamps.jpg` → `mark-v3-wax-seal.jpg` |
| Captions stay off the card faces | Captions printed under each photo | At 2–6 photos per 6 × 4 card they'd be tiny or truncated; full captions live in the letter view and below the card | Assumption; worth testing in the pilot |
| Recipient entry: short envelope, then the card | Card shown immediately | The envelope gives a moment of arrival; it's one tap, and repeat visits skip it | Only this approach was built. **A direct-to-card variant was not prototyped**, so the comparison the brief asks for is still open. |
| Card composition | — | Deterministic layouts per count | **Only one composition set was built**; a second (e.g. a caption-forward polaroid set) was not prototyped. Open item. |

### References: observed vs proposed

- **Moodboard (inspected):**
  - stamp-covered envelopes;
  - a journal note reading "unpolished and messy and true";
  - single-stroke spiral snails (including one in a black perforated stamp);
  - painted snails;
  - TIERRA, peach pit and pinefolk type samples;
  - a Pantone Rust swatch.

  We took the spiral, the perforation, clay on cream and the moss accent. Nothing was traced.
- **Ramp sketchbook post: NOT INSPECTED.** X returned HTTP 402 (login required). The turn is our own proposal.
- **ticket-card (inspected):**
  - It's a single three.js card you spin, stamp and flip. It is **not** a cluster.
  - Observed flip details: 0.85 s with `easeInOutCubic`; the card lifts by `sin(πt)`; the shadow is ~35% lighter and ~25% larger at the peak; there's a hover tilt and an idle sway.
  - We adopted the lift and the shadow (at 650 ms) and dropped the idle sway, because nothing should move while someone reads.
  - The code is MIT and the art is all rights reserved. **Nothing was copied.**

## D. Test evidence

| Date | Build | Command or manual procedure | Environment | Result/count | Failure or limitation | Evidence location |
|---|---|---|---|---|---|---|
| 2026-10-16 | 9b24a3d | `npm run lint` | macOS, Node 22.23.3 | exit 0, no warnings | — | terminal |
| 2026-10-16 | 9b24a3d | `npm run typecheck` | same | exit 0 | — | terminal |
| 2026-10-16 | 9b24a3d | `npm test` (Vitest 5) | Node + jsdom | 6 files, **43 passed** | jsdom ignores `inert` for focus, so the focus walk is done in e2e instead | `tests/unit` |
| 2026-10-16 | 9b24a3d | `npm run build` | Next 16.4.2 | exit 0, 13 routes | — | terminal |
| 2026-10-16 | 9b24a3d | `npx playwright test` (1.64.1, production build) | Chromium desktop; Chromium Pixel 7; WebKit iPhone 14 | **120 passed, 9 skipped** (41/2, 40/3, 39/4) | Skips: 6 publishing tests **BLOCKED** (no backend); 2 fake-mic recording tests (fake device only in desktop Chromium); 1 clipboard grant (Chromium-only) | `tests/e2e` |
| 2026-10-16 | earlier | First full e2e run | 3 projects | 8 WebKit failures | IndexedDB rejected Blobs in WebKit ephemeral sessions → fixed (ArrayBuffer) → rerun passes | commit `1fa61f7` |
| 2026-10-16 | earlier | First Chromium e2e run | Chromium | 4 failures | 2 test selectors matched Next 16's hidden previous route; 1 Next route-announcer `role=alert`; 1 axe scan during a fade. Test fixes; rerun passes | — |
| 2026-10-16 | earlier | Visual: sample PDF exported and rasterized (`scripts/export-sample-pdf.mts`) | sips | Found handwriting glyphs missing → fixed → reinspected | — | `docs/evidence/print-page-*.jpg` |
| 2026-10-16 | 9b24a3d | Visual: `scripts/evidence.mts` | Chromium 320/390/1280, 390 large text, Easy Reading creator | 41 captures, all without horizontal overflow, after fixing step-indicator overflow (26–88 px) found by the first capture | Full-page captures show sticky header/nav mid-page (capture artifact) | `docs/evidence/*.jpg` |
| 2026-10-16 | 9b24a3d | axe-core WCAG 2.1 A/AA scans (automated) | 3 projects | 0 violations on /today, /keepsakes, /settings, /demo (card + letter), the open-card dialog and the list | Automated scans are not complete proof | e2e |
| — | — | Manual screen reader (VoiceOver/TalkBack) | — | **NOT RUN** | Needs a manual session | — |
| — | — | Real-device share sheet, microphone, camera, HEIC, in-app browsers (WhatsApp, WeChat) | — | **NOT RUN** | Needs physical phones | — |
| — | — | Cross-device publication with a fresh recipient | — | **BLOCKED** | No Supabase project | `tests/e2e/publish.spec.ts` |
| — | — | Home printer duplex alignment | — | **NOT RUN** | Needs a printer | — |

## E. What was created

- **Screens:** Today, Compose (three steps, live preview on desktop), Preview with share and print, Keepsakes (pile and list), Settings, the recipient page (sample and shared link), and the unavailable-link page.
- **Components:**
  - the card faces and FlipCard, plus LetterView;
  - the VoiceRecorder and VoicePlayer, and the stamp picker;
  - ShareActions, the print button, and the PostcardCluster with its pure state machine;
  - the add-moment dialog and moment list, and the confirm dialog.
- **Data:** one content model (`lib/model.ts`), an IndexedDB store with frozen snapshots and garbage collection, the Supabase migration (tables, RLS, immutability trigger, private bucket, storage policies), and server-side validation.
- **Original assets:** the snail mark and favicon, four stamps, envelope and small ephemera, four sample illustrations, and labeled synthetic narration (`docs/assets.md`).
- **Export:** a static pdf-lib print path with embedded OFL fonts, a QR bridge and a continuation page.
- **Tests:** 43 unit tests and 129 e2e cases across 3 browser profiles (120 pass, 9 deliberately skipped), plus evidence scripts.
- **Docs:** README, `demo-script.md`, `assets.md`, `supabase-setup.md`, `deploy.md` and this log.

## F. Known limitations and next steps

- **Cross-device links: BLOCKED.** Follow `docs/supabase-setup.md`, then run `tests/e2e/publish.spec.ts`. Clean-up of abandoned server uploads and migrating drafts to an email account are not built.
- **Google Doc: snapshot only.** The connected Google Drive can create a Doc but not edit one, so the Google Doc is a snapshot of this log from 2026-10-16. Updating it in place would need a Google Docs editing connector; until then a fresh copy replaces it after each milestone.
- **Vercel preview: BLOCKED** until the repo is connected (`docs/deploy.md`).
- **Real devices: NOT RUN.** Share sheet, microphone and codecs, camera, HEIC, in-app messaging browsers, manual screen reader, printer duplex.
- **Exploration gaps:** a second card composition and a direct-to-card recipient entry were not prototyped.
- **Out of scope, by design:** translation, translated or cloned voice, scheduled delivery, physical mailing, contact import, subscriptions, native app.
- **Pilot to propose (not done):** several student–relative pairs. Can the sender make one unaided? Can the recipient open, listen and read without coaching? Is it a more coherent day than scattered photos? Does either want to keep it, or get another?
