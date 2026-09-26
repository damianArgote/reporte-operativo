# Settings screen

**Objective**: A "Configuración" screen split into sections, starting with Apariencia (theme and background color palette) and Perfil (user name).

**Why**: The user wants one place for preferences that can grow with more features.

**Scope**:
- Simple in-app navigation (no router dependency), reusable by M2 (history, search).
- A central settings-sections registry: a new section is added with one registry entry plus its component, without editing the screen.
- Theme control moves from the Today header into Apariencia.
- Background palette: preset colors, each with a light and a dark variant; persisted in Settings.
- User name: shown only inside the app (e.g. a greeting in the Today header), never in the generated report (user decision, 2026-09-26).

**Constraints**: `CLAUDE.md` rules. Settings stays in IndexedDB (single source of truth). Rows saved before this change must still load (Zod defaults). The report output (golden fixture) must not change.

**TDD**: Strict (source: session config). Runner: Vitest (`npm run test`).

**Delivery**: Branch `feat/settings-screen`, stacked on `feat/m1-mvp`. Work-unit commits. No remote yet. RDD off.

## Acceptance criteria

- A settings entry point in the Today header opens Configuración; back returns to Today.
- Sections render from the registry, in order.
- Theme and background selections apply immediately, persist across reloads, and do not flash on startup.
- Background colors are readable in light and dark (contrast on text).
- User name persists and shows in the app. The golden report test is unchanged and passes.
- `npm run verify` is green.

## Tasks

| ID | Task | Route | Status | Commit |
|---|---|---|---|---|
| T1 | Navigation (view state) + settings sections registry + screen shell with back | delegated (writer trigger) | [x] | `9e9ecef` |
| T2 | Apariencia: theme control moved + background palette (schema, persistence, CSS variables, anti-flash) | delegated (writer trigger) | [x] | `cd0177c` |
| T3 | Perfil: user name (schema, input, greeting in Today header) + spec update | delegated (writer trigger) | [x] | `b93ed14` |

## Progress

All three tasks implemented, strict TDD (RED confirmed before each unit's implementation, then GREEN), one work-unit commit per task on `feat/settings-screen`.

**T1 — `9e9ecef`**: `uiStore` gained a typed `view: 'today' | 'settings'` union plus `navigate()`/`syncViewFromLocation()`/`initNavigationSync()`, synced with `location.hash` (`#/settings`) via `pushState` + a `hashchange`/`popstate` listener wired from `App.tsx`, so browser/Android back works. `src/features/settings/settingsSections.ts` is the registry (`{ id, title, description?, icon, component }[]`); `SettingsScreen.tsx` renders its header (back button, "Configuración") and every section from the registry in order. Today header gained the "Configuración" icon button (replacing `ThemeToggle`'s slot, component removed in T2). Placeholder `AppearanceSection`/`ProfileSection` created here, filled in by T2/T3.

**T2 — `cd0177c`**: `Settings.background` added to `settingsSchema` with `.default('neutral')` (old rows without the field still parse — covered in `settings.repository.test.ts` and `schemas.test.ts`). `src/types/backgroundPaletteIds.ts` holds the id union (`neutral, arena, salvia, niebla, lavanda, piedra`); `src/features/settings/backgroundPalette.ts` holds the actual light/dark oklch values. `backgroundPalette.test.ts` computes WCAG contrast (a small pure oklch→linear-sRGB→relative-luminance helper, test-only) for every preset × light/dark against the app's fixed `--foreground` — all 12 combinations pass ≥4.5:1 on the first try (chosen lightness: light presets L 0.95-0.96, dark presets L 0.19-0.21 — both comfortably inside the safe range against the app's near-black/near-white foreground). `useBackgroundPalette.ts` applies `data-background` on `<html>` + mirrors to `localStorage` (`background-mirror`), consumed by `index.html`'s extended anti-flash script. CSS added to `index.css` (`[data-background="…"]` / `.dark[data-background="…"]`, `--background` only — `--card`/`--popover`/`--muted` left as-is, see Deviations). `AppearanceSection.tsx` now has the real "Claro/Oscuro/Sistema" radio group (shadcn `RadioGroup`, added via `npx shadcn@latest add radio-group`) and the swatch picker (`role="radio"`/`aria-checked`, Spanish `aria-label` per preset, visible check on selection). `ThemeToggle.tsx`/`.test.tsx` deleted; their coverage now lives in `AppearanceSection.test.tsx`.

**T3 — `b93ed14`**: `Settings.userName` added (`z.string().trim().max(40).default('')`). `ProfileSection.tsx`: "Nombre" input, saves on blur, subtle "Guardado" text (no alerts). Today header shows "Hola, {nombre}" only when set. `reportGenerator.test.ts` gained a new test proving `renderWhatsAppText` is byte-for-byte identical regardless of `userName` — the pre-existing golden test (`golden-2026-09-26`) was left untouched and still passes (its fixture's `goldenSettings.userName` was set to a non-empty `'Damian'`, which by itself already proves the report is unaffected). `docs/specs/domain.md` updated: Settings table gained `background`/`userName` rows; Decisions #16 (background palette) and #17 (userName app-only) added, both Confirmed.

### Verification evidence (run at the end, after T3)

- `npm run lint` — clean, no output.
- `npm run typecheck` — clean, no output.
- `npm run test` — `23 test files / 198 tests passed`, run twice back-to-back (flakiness check), both runs identical (198/198).
- `npm run build` — succeeds (`tsc -b && vite build` + PWA precache); pre-existing >500kB single-chunk warning only (not introduced by this change).
- `npm run verify` — green end-to-end (lint → typecheck → test → build).
- Impeccable mechanical design detector (`detect.mjs`) run once over the changed UI files (`SettingsScreen.tsx`, `AppearanceSection.tsx`, `ProfileSection.tsx`, `TodayScreen.tsx`) — no findings.

### Deviations from the brief

- `<meta name="theme-color">` was **not** made dynamic per background preset (the brief allowed "leave as is and report"). Kept static (light/dark only) — making it track the resolved preset would need reading the current `data-background` + resolved theme at multiple points (anti-flash script, theme/background change) for a cosmetic browser-chrome detail, out of proportion to this task's scope.
- CSS presets override only `--background` (the brief said `--card/--popover/--muted` "if needed for coherence"). Not overridden — the app doesn't use Card-heavy surfaces here, and it keeps the CSS/registry surface smaller for a first cut; can be extended per-preset later if a section leans on `--card`/`--popover`.

## Next step

All three tasks are done and `npm run verify` is green. Follow-up ideas (not required by this change): make `<meta theme-color>` reactive per preset; consider tinting `--card`/`--popover` per preset if a future section relies on them.
