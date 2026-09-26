# M1 — MVP

**Objective**: A usable daily log on a phone: today's report, fast entry by type or free text, live counters, formatted preview, rich copy to clipboard, installable offline PWA, dark mode.

**Why**: Replace the manual WhatsApp workflow with structured entry plus automatic numbering, counters and report text.

**Scope**: M1 as defined in `CLAUDE.md`. Excluded (later milestones): history, calendar, search (M2); share, email, TXT, JSON export/import (M3).

**Constraints**: `CLAUDE.md` architecture rules; specs in `docs/specs/` are the source of truth. No backend. No dependency outside the declared stack without justification.

**TDD**: Strict (source: session config). Runner: Vitest (`npm run test`). RED → GREEN → REFACTOR for domain, services, repositories and stores.

**Delivery**: Work-unit commits on `feat/m1-mvp`. Strategy `ask-on-risk`. Forecast ~2000+ authored lines, so it exceeds the ~400-line slice heuristic; the chain strategy will be asked before the first PR. RDD is off (global), so no native review runs.

## Acceptance criteria

- `npm run verify` is green (lint, typecheck, test, build).
- The golden fixture `golden-2026-09-26` renders byte-for-byte.
- Entries persist across reloads (IndexedDB).
- Add, edit, delete and duplicate update the list, counters and preview immediately.
- Copy writes `text/plain` (WhatsApp markup) and `text/html`, and shows a "Copiado" toast.
- The build produces a manifest and service worker; the app works offline after first load.
- Light, dark and system themes, persisted.

## Tasks

| ID | Task | Route | Status | Commit |
|---|---|---|---|---|
| T1 | Scaffold: Vite react-ts at repo root, strict TS, Tailwind v4, shadcn/ui, ESLint, Vitest + Testing Library + fake-indexeddb, scripts incl. `verify` | delegated (writer trigger: 2+ non-trivial files) | [x] | 19b94ce |
| T2 | Domain: types, Zod schemas, entry-type registry, date utils, counters, `generateDailyReport` + `renderWhatsAppText` + `renderHtml` (golden and derived tests) | delegated (writer trigger) | [x] | d6fcf22 |
| T3 | Persistence: Dexie database, reports/entries/settings repositories with tests | delegated (writer trigger) | [x] | 97b69fe |
| T4 | Stores: Zustand `reportStore` (persisted data via repositories) and `uiStore` (UI state) with tests | delegated (writer trigger) | [x] | 0742c06 |
| T5 | Today UI: date header, day header editor, entry list, counters, FAB, add sheet by type, quick free-text, edit/delete/duplicate, preview, rich copy + toast | delegated (writer trigger) | [x] | fae0ea2, 81836e6 |
| T6 | PWA (manifest, icons, service worker) and dark mode | delegated (writer trigger) | [x] | d4c939f, 2e688c7 |

## Progress

- Specs confirmed by the user on 2026-09-26 (decisions 1–12); decisions 13–15 are M1 defaults.
- T2 done (d6fcf22): pure domain layer (types/schemas/registry/dates/counters/generator/renderers), 79 tests green, `npm run verify` clean; two spec gaps found and resolved per golden fixture (see commit).
- T3 done (97b69fe): Dexie database (`src/db/database.ts`) plus reports/entries/settings repositories, all validating with the T2 Zod schemas on read and write; 25 new tests green (CRUD, idempotent `getOrCreateByDate`, normalization on write, duplicate ordering, cross-instance persistence), `npm run verify` clean.
- T4 done (0742c06): `reportStore` (Zustand, repository-backed, injectable deps for tests) and `uiStore` (UI-only state), plus derived selectors/hooks (`selectDocument`/`useReportDocument`, `selectPlainText`/`usePlainText`, `selectHtml`/`useHtml`, `selectCounters`/`useCounters`) memoized via `useShallow`+`useMemo`; 12 new tests green (load, mutate+reload+renumber, header/settings propagation, error status, uiStore transitions), `npm run verify` clean.
- T5 done (fae0ea2, 81836e6): Today screen — sticky date/"Hoy" header with
  editable day-header textarea, quiet-when-zero counters strip, scrollable
  entry timeline (derived "N." via new `computeTowedNumbering`/
  `renderEntrySpans`/`renderNumberedEntrySpans` exports, so the row reuses
  the generator's own formatter/denounced/number logic), row menu
  (Editar/Duplicar/Eliminar with undo-via-toast delete backed by a new
  `entries.repository.restore()`/`reportStore.restoreEntry()`), pinned
  quick free-text bar, FAB → two-step add sheet (type grid incl. a
  "Denuncia" tile, then per-type fields/toggles/time; same form reused for
  edit), "Vista previa" sheet rendering the `ReportDocument` model as React
  elements (no `dangerouslySetInnerHTML`), and "Copiar" wired to the new
  `services/clipboard.ts` (`ClipboardItem` with a `writeText` fallback) with
  a "✓ Copiado" toast. `App.tsx` now calls `load()` on mount with
  loading/error states and mounts `<Toaster/>`. 7 new integration tests
  (real store + fake-indexeddb) covering the full T5 acceptance list, plus
  10 new domain/store unit tests (numbering helpers, restore/undo, uiStore
  preset); 136 tests total green, `npm run verify` clean (build: ~602 kB JS /
  189 kB gzip, one chunk-size warning, no code-splitting configured yet).
  Spec ambiguity resolved: "Denuncia" tile opens the
  `construction` form with `denounced` preset true — see `EntrySheet.tsx`
  doc comment for the golden-fixture evidence this is based on.

- T6 done (d4c939f, 2e688c7):
  - **T6a dark mode** (d4c939f): Settings.theme (IndexedDB, existing) stays
    the single source of truth — no `next-themes` (removed, was a second
    localStorage-based source). New `src/hooks/useTheme.ts`:
    `resolveTheme`/`applyResolvedTheme` (pure) plus `useResolvedTheme()` (a
    `useSyncExternalStore`-backed hook tracking `matchMedia` live for
    "system", applying the `dark` class to `<html>` and mirroring the
    resolved value to `localStorage['theme-mirror']`), called from both
    `App.tsx` (whole-app effect) and the rewritten `sonner.tsx` Toaster (so
    toasts match). New `ThemeToggle` (dropdown, aria-label "Tema",
    Claro/Oscuro/Sistema) wired into `TodayScreen`'s header, persisting via
    the existing `reportStore.updateSettings`. `index.html` gained a tiny
    inline anti-flash script reading the mirror key before paint, plus
    light/dark `<meta name="theme-color">`. 14 new tests (hook incl. the
    matchMedia "change" event, Toaster resolved theme, ThemeToggle
    persistence). Also fixed a pre-existing flaky assertion in
    `App.test.tsx` (synchronous check right after an unawaited
    `removeEntry`) that the extra render/hook load from theme wiring made
    intermittently visible — replaced with `waitFor`.
  - **T6b PWA** (2e688c7): `vite-plugin-pwa@1.3.0` (current release already
    supports Vite 8 via `peerDependencies.vite: ^8.0.0` — no downgrade
    needed). `registerType: 'prompt'`, not `autoUpdate`: an operator can have
    an unsaved add-entry draft open (in-memory `uiStore` state, not
    persisted until "Guardar"), and autoUpdate's immediate
    activate-and-reload could silently drop it; `src/pwa/registerSW.ts`
    shows a non-invasive "Nueva versión disponible" toast with an
    "Actualizar" action instead. Icons authored from one `public/icon.svg`
    source (a simple clipboard/checklist glyph) via
    `@vite-pwa/assets-generator` — run as a one-off (`npx pwa-assets-generator`,
    reading the committed `pwa-assets.config.ts`), NOT installed as a
    project devDependency: it conflicts with vite-plugin-pwa's peerOptional
    `^1.0.0` range, and forcing it with `--legacy-peer-deps` was observed to
    silently drop the required `@testing-library/dom` peer, breaking
    typecheck until reinstalled. Workbox `globPatterns` precache
    js/css/html/ico/png/svg/woff2; `navigateFallback: 'index.html'`; no
    runtime caching (no external origins). Manifest fields per spec
    (name/short_name/description es/lang es/start_url/scope "/" /standalone/
    portrait/background+theme color matching the light theme/categories
    productivity). Removed the old default `favicon.svg`. Build: 19 precache
    entries, 731.48 KiB (3 harmless duplicate entries — vite-plugin-pwa
    always precaches `manifest.icons` explicitly on top of the glob match;
    functionally deduped by Workbox at runtime). Verified via
    `vite preview` + `curl`: `/manifest.webmanifest` and `/sw.js` both serve
    200 with correct content-type and content; a real offline-in-browser
    check was out of reach here. `npm run verify` green (151 tests, lint,
    typecheck, build all clean).

## Next step

M1 complete pending manual device check; decide PR strategy (feature > 400 lines → ask chain strategy).
