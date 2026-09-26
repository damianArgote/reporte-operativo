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
| T4 | Custom background colors: user builds colors with `<input type="color">` (one value for light, one for dark), live contrast indicator, automatic black/white text when contrast < 4.5:1, saved next to presets, deletable | delegated (writer trigger) | [x] | `d9376ab`, `3840501` |

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

## Scope change (2026-09-26)

User asked for custom palette colors: background color only (not accent). Added T4.

**T4 — `d9376ab`, `3840501`**: Strict TDD, RED confirmed per unit then GREEN (color utils, schema, fallback resolution, apply hook incl. theme switch, AppearanceSection create/select/delete flow); two work-unit commits (a preceding refactor, since the diff was large, then the feature).

- `d9376ab` (`refactor(color): extract contrast utilities`): moved the OKLCH/linear-sRGB/relative-luminance/WCAG-contrast math that lived as a test-only helper in `backgroundPalette.test.ts` into `src/utils/color.ts`, with its own tests (`color.test.ts`); `backgroundPalette.test.ts` now imports it — no duplication, no behavior change.
- `3840501` (`feat(settings): add custom background colors with automatic readable text`):
  - `Settings.customBackgrounds: { id: 'custom-<uuid>'; light: '#rrggbb'; dark: '#rrggbb' }[]` — Zod `customBackgroundSchema` (lowercase-normalized hex, `custom-<uuid>` id pattern), `.max(8).default([])` on the array.
  - `Settings.background` loosened from an enum of preset ids to `z.string().min(1).default('neutral')`, so it can also hold a custom background's id. `settingsSchema` is now `settingsShape.transform(...)`: a background that matches neither a preset id nor an existing `customBackgrounds` entry falls back to `'neutral'` at parse time (covered for an old row and for a deleted custom id, in both `schemas.test.ts` and `settings.repository.test.ts`).
  - `src/utils/color.ts` gained `APP_FOREGROUND_HEX`/`APP_MUTED_FOREGROUND_HEX` (the app's actual `--foreground`/`--muted-foreground` tokens, pre-converted to hex), `resolveReadableForeground(bgHex, defaultFgHex)` (keeps the default when it already contrasts ≥4.5:1, else picks whichever of near-black/near-white — the same two tokens — contrasts best), and `resolveReadableMutedForeground(bgHex, foregroundHex)` (searches the 256 gray levels between bg/fg luminance for the most-muted tone that still clears 4.5:1, relaxing to 3:1 and reporting the shortfall if 4.5 isn't reachable).
  - `src/features/settings/customBackgrounds.ts` (new, pure): id creation (`crypto.randomUUID()`), preset/custom id discrimination, lookup, `resolveCustomBackgroundApplication(bgHex, theme)` (combines the two color.ts resolvers into one `{ backgroundHex, foregroundHex, mutedForegroundHex }` shape, `null` meaning "no override"), and `resolveEffectiveBackgroundHex(background, customBackgrounds, theme)` (seeds the editor from whatever is currently applied, converting an oklch preset to hex via `oklchToHex`).
  - `useBackgroundPalette.ts`: a preset selection is unchanged (`data-background` + CSS). A custom selection sets `--background` (and `--foreground`/`--muted-foreground` only when overridden) as inline styles on `<html>`, re-resolving live on every `background`/`customBackgrounds`/resolved-theme change (covered: theme switch while a custom background is selected). Switching back to a preset clears the inline vars. `CUSTOM_BACKGROUND_MIRROR_KEY` (`background-custom-mirror`) mirrors the fully pre-resolved `{ light, dark }` application (not the raw hex pair) to `localStorage`, so `index.html`'s anti-flash script only ever validates and applies plain hex — it never repeats the OKLCH/WCAG math (kept tiny and defensive: try/catch, a hex regex before every `setProperty`). Manually verified with a small scratch script since no test in this repo targets the inline HTML script directly (same as T2's script).
  - `AppearanceSection.tsx`: custom swatches render after the presets in the same `role="radio"` grid, `aria-label` "Color personalizado N"; the selected one shows a small "×" delete affordance (`aria-label` "Eliminar color personalizado N") that falls the selection back to `'neutral'` when deleted. "Crear color" (hidden past 8 colors, with a note) opens a compact inline editor: two native `<input type="color">` (`Label htmlFor` "Fondo claro"/"Fondo oscuro", defaulting to `resolveEffectiveBackgroundHex` of the current selection), a live preview per color (sample text tinted via `resolveReadableForeground`, "Se lee bien" / "Poco contraste · el texto se ajusta automáticamente"), "Guardar" (adds + selects) / "Cancelar". All new interactive controls are 44px (`h-11`/`size-11`), matching the existing preset swatches/username input.
  - `docs/specs/domain.md`: `customBackgrounds` row added to the Settings table; Decision #18 (custom background colors, Confirmed).

### Verification evidence (T4)

- `npm run lint` — clean, no output.
- `npm run typecheck` — clean, no output (two pre-existing `Settings` literals without `customBackgrounds` — `entryTypeRegistry.test.ts`, `golden-2026-09-26.ts` fixture — updated to satisfy the new required field).
- `npm run test` — `25 test files / 255 tests passed`, run twice back-to-back, both runs identical (255/255).
- `npm run build` — succeeds; same pre-existing >500kB single-chunk warning as before (not introduced by this change).
- `npm run verify` — green end-to-end.
- Impeccable mechanical design detector (`detect.mjs`) run once over `AppearanceSection.tsx` — no findings.

### Deviations from the brief (T4)

- The muted-foreground "suitable mid tone" is resolved by an exhaustive search over the 256 renderable gray levels between the background's and the foreground's own luminance (picking the one closest to the background that still clears the target), rather than a closed-form calculation — deliberate: it guarantees the result is an actual renderable hex value and stays correct at the 3:1 fallback boundary, at the cost of a bounded 256-iteration loop per resolution (cheap, runs only on background/theme change).
- The anti-flash `index.html` script has no automated test (same as T2's): inline `<script>` content isn't imported by any test file in this repo. Verified manually with a throwaway Node script (not committed) exercising the extracted script body against preset-only, custom-with-override, and malformed-hex-ignored scenarios.

## Next step

All four tasks are done and `npm run verify` is green. Follow-up ideas (not required by this change): make `<meta theme-color>` reactive per preset/custom background; consider tinting `--card`/`--popover` per preset/custom background if a future section relies on them.
