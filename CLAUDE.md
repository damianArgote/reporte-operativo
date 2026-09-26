# Reporte Operativo

## Purpose

Mobile-first PWA that replaces a WhatsApp-based daily field log for towing/parking
enforcement operators ("playa" = the tow lot). Operators currently type a running
log by hand in a WhatsApp chat; this app structures that log into entries and
generates the same report as formatted text for one-tap copy into WhatsApp.

**Golden UX rule**: if a feature makes logging slower than typing directly in
WhatsApp, reconsider it. Speed of entry beats completeness of features.

100% frontend. No backend, no auth, no remote API, no remote database.

## Stack

React + TypeScript (strict) + Vite + Tailwind + shadcn/ui + Lucide icons +
Zustand + Dexie (IndexedDB) + Zod + vite-plugin-pwa.
Tests: Vitest + Testing Library + fake-indexeddb.
No other dependencies without explicit justification.

UI copy is in Spanish (users are Spanish-speaking, Argentina). Code, identifiers,
and comments are in English.

## Commands

*(scripts created at scaffold time)*

- `npm run dev` — local dev server
- `npm run lint` — lint
- `npm run typecheck` — TypeScript strict check, no emit
- `npm run test` — Vitest
- `npm run build` — production build
- `npm run verify` — `lint && typecheck && test && build`, the single gate for "done"

## Definition of Done

- `npm run verify` passes clean.
- No known errors or console warnings in core flows.
- No TODOs left in core features (M1 scope).

## Testing policy: Strict TDD (enabled)

Domain logic, services, and the report generator/renderers follow strict
RED → GREEN → REFACTOR: write a failing test first, make it pass with the
minimum code, then refactor with tests green. This applies to `domain/`,
`services/`, `utils/dates`, `utils/counters`, and the entry-type registry.
UI components may use a lighter testing bar (interaction/rendering tests),
but any logic extracted out of a component still follows strict TDD.

## Architecture rules

- Components never touch Dexie directly. All persistence goes through
  repositories in `src/db/`.
- All report text is produced only via `generateDailyReport()` plus the two
  pure renderers (`renderWhatsAppText`, `renderHtml`). No component builds
  report strings by hand.
- Entry-type behavior (fields, formatting, defaults) lives only in the
  centralized entry-type registry — never hardcoded per component.
- UI-only state (`uiStore`: selected tab, dialogs, drafts) is separate from
  persisted data (reports/entries in Dexie via repositories).
- No `any`. No `dangerouslySetInnerHTML` — the preview renders the document
  model directly.

## Folder map

```
src/app/                  routing/shell
src/components/{ui,daily-report,entries,preview,sharing}
src/features/{daily-report,history,search,settings}
src/db/                   Dexie schema + repositories
src/services/             reportGenerator, renderers, clipboard, sharing, export
src/stores/                Zustand stores (uiStore, etc.)
src/types/                domain types (DailyReport, DailyEntry, ...)
src/utils/{dates,counters}
```

## Domain glossary

- **playa** — the tow lot; destination of a towed vehicle.
- **LP / MI** — entry types for vehicles towed for different infraction classes.
- **Reservado de Obra** — towed and reserved due to a construction-site
  obstruction (picker label "OBRA").
- **Infraccionado** — vehicle ticketed in place, not towed.
- **Denuncia** — flag on an entry (police/formal report filed); not a
  separate counted type.
- **towed** — boolean; true means the vehicle went to the playa and gets a
  report number.
- **Novedad** — free-text entry type for anything else.

## Hard NOs

No backend. No login/auth. No remote database. No analytics/tracking. No push
notifications. No AI features in the app itself. No Next.js (Vite only).

## Privacy

Fully local-first. No data leaves the device. No analytics, no telemetry, no
third-party network calls.

## Specs

`docs/specs/` is the source of truth for domain rules and report format. Read
`docs/specs/domain.md` and `docs/specs/report-format.md` before touching the
generator, renderers, entry-type registry, or the data model types.

## Milestones

- **M1 (MVP)**: today view, quick-add by type, quick free-text, entry list,
  edit/delete/duplicate, per-type counters, live preview, rich clipboard copy,
  PWA offline support, dark mode.
- **M2**: history view, calendar navigation, search across past reports.
- **M3**: Web Share/email/TXT export; JSON export/import with Zod validation
  and confirm-before-overwrite.
