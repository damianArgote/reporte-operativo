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
| T1 | Navigation (view state) + settings sections registry + screen shell with back | delegated (writer trigger) | [ ] | |
| T2 | Apariencia: theme control moved + background palette (schema, persistence, CSS variables, anti-flash) | delegated (writer trigger) | [ ] | |
| T3 | Perfil: user name (schema, input, greeting in Today header) + spec update | delegated (writer trigger) | [ ] | |

## Next step

T1–T3 with one writer, one commit per task.
