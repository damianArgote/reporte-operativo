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
| T2 | Domain: types, Zod schemas, entry-type registry, date utils, counters, `generateDailyReport` + `renderWhatsAppText` + `renderHtml` (golden and derived tests) | delegated (writer trigger) | [ ] | |
| T3 | Persistence: Dexie database, reports/entries/settings repositories with tests | delegated (writer trigger) | [ ] | |
| T4 | Stores: Zustand `reportStore` (persisted data via repositories) and `uiStore` (UI state) with tests | delegated (writer trigger) | [ ] | |
| T5 | Today UI: date header, day header editor, entry list, counters, FAB, add sheet by type, quick free-text, edit/delete/duplicate, preview, rich copy + toast | delegated (writer trigger) | [ ] | |
| T6 | PWA (manifest, icons, service worker) and dark mode | delegated (writer trigger) | [ ] | |

## Progress

- Specs confirmed by the user on 2026-09-26 (decisions 1–12); decisions 13–15 are M1 defaults.

## Next step

T1.
