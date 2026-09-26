# Domain Spec

Source of truth for entities, entry types, numbering/counter rules, and
persistence. Read this before touching `types/`, the entry-type registry, or
the report generator.

## Entities

### DailyReport

| field | type | notes |
|---|---|---|
| `id` | string | primary key |
| `date` | `YYYY-MM-DD` | local calendar date; unique per report |
| `header` | string | free-text lines shown under the date (shift info etc.), stored verbatim |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### DailyEntry

| field | type | notes |
|---|---|---|
| `id` | string | primary key |
| `reportId` | string | FK to `DailyReport.id` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |
| `time` | `HH:mm` | local time of the event |
| `type` | entry-type id | see registry below |
| `towed` | boolean | true = vehicle went to the playa, gets a report number |
| `denounced` | boolean | true = append " Denuncia." to the rendered line |
| `includeInReport` | boolean | false = entry is tracked in-app but omitted from generated text |
| `sortKey` | number | tiebreaker for manual reordering (future); default derived from `time`+`createdAt` |
| `fields` | record | per-type structured fields: `plate`, `vehicle`, `identifier`, `street`, `addressNumber`, `reason`, `observation` |
| `rawText` | string? | only for `free` type; stored and emitted verbatim |
| `metadata` | record? | reserved, not used by M1 |

### Settings

| field | type | notes |
|---|---|---|
| `theme` | `light \| dark \| system` | |
| `ticketedEmoji` | string | default `📱`, see Decisions |
| `background` | preset id or custom background id | default `neutral`; presets in `src/features/settings/backgroundPalette.ts`; a stale/unknown value (e.g. a deleted custom background) falls back to `neutral` at parse time, see Decisions #18 |
| `userName` | string | trimmed, max 40, default `''`; app-only — shown in-app (Today header greeting), never in the generated report, see Decisions #17 |
| `customBackgrounds` | `{ id, light, dark }[]` | default `[]`, max 8; `id` is `custom-<uuid>`; `light`/`dark` are lowercase `#rrggbb` hex, background only (no accent), see Decisions #18 |

## Invariants

1. A "numbered entry" is any entry with `towed === true`. Numbers are **never
   stored**; they are derived at render time from the order of towed entries
   within a report (1..N), recalculated whenever an entry is added, deleted,
   reordered, or has `towed`/`type` changed. No gaps, no persisted index.
2. `Hoy N a playa:` — `N` is the count of towed entries in the report. Entries
   with `towed === false` are never counted, regardless of `includeInReport`.
3. Per-type counters (e.g. `LP: 4`) count only towed entries of that type, and
   the counters always sum to `N`.
4. `denounced` is a flag on an existing entry, not a separate counted type or
   a separate entry-type id. It only affects rendering (appends `Denuncia.`).
5. Plates are uppercased and trimmed before storage/render. Structured fields
   (`street`, `reason`, `observation`, etc.) have internal whitespace
   collapsed; `rawText` is never touched.
6. Dates are the **local** calendar date, stored as an ISO `YYYY-MM-DD` string
   key — never a `Date` object, never a UTC conversion. Display format is
   `DD/MM/YYYY`. Implemented with small local utils in `utils/dates`, no date
   library.
7. All persistence goes through Dexie (IndexedDB) via repositories in
   `src/db/`. Repositories and any import boundary validate with Zod before
   writing or after reading external JSON.

## Entry-type registry

Centralized `EntryTypeConfig` per id: `label`, `icon` (Lucide name),
`towedByDefault`, `countedLabel`, `fields`, `formatter`. Formatters return
spans with **no number prefix** — the generator prepends `"N. "` for towed
entries.

| id | label (picker) | towed by default | fields | rendered line |
|---|---|---|---|---|
| `lp` | LP | true | plate, street, addressNumber, observation? | `{plate} un LP en {street} {addressNumber}.` (+ ` {observation}` if present) |
| `mi` | MI | true | plate, street, addressNumber, observation? | `{plate} un MI en {street} {addressNumber}.` |
| `construction` | Reservado de Obra (picker label "OBRA") | true | plate, vehicle, street, addressNumber, reason, observation? | `{plate} {vehicle} {street} {addressNumber} {reason}.` |
| `ticketed` | Infraccionado | false | plate, identifier, observation? | `{plate} un {identifier}/{ticketedEmoji} Infraccionado.` |
| `free` | Novedad | false | rawText | rawText, verbatim |

`denounced === true` appends ` Denuncia.` after the formatter output,
regardless of type.

Note on the ticketed emoji: the original brief showed 🅿️, but the real
screenshot evidence shows 📱. The emoji is a `Settings.ticketedEmoji` config
value, defaulting to 📱 — see Decisions.

## Persistence rules

- Storage: IndexedDB via Dexie. One store for reports, one for entries
  (indexed by `reportId` and `date`).
- Access: only through repositories in `src/db/`; components never import
  Dexie directly.
- Validation: Zod schemas at the repository boundary (every write/read) and
  at any JSON import boundary (M3).
- No remote sync of any kind.

## Decisions

| # | Decision | Status | Evidence |
|---|---|---|---|
| 1 | Numbered entry = towed vehicle; domain field is `towed: boolean` (brief's "numbered" maps to this) | Confirmed | User confirmation |
| 2 | Numbers are derived at render time, never stored; recalculated 1..N on any change | Confirmed | User confirmation |
| 3 | `Hoy N a playa:` counts only towed entries; per-type counters sum to N | Confirmed | User confirmation |
| 4 | `generateDailyReport()` is the single source of truth, returning a document model consumed by two pure renderers (`renderWhatsAppText`, `renderHtml`) | Confirmed | User confirmation |
| 5 | Clipboard copy writes both `text/plain` and `text/html` via `ClipboardItem`, with a `writeText` fallback | Confirmed | User confirmation |
| 6 | Preview renders the document model with formatting applied; never `dangerouslySetInnerHTML` | Confirmed | User confirmation |
| 7 | Denuncia is a flag (`denounced: boolean`) on an existing entry, not a separately counted type | Confirmed | KMB728 appears untowed at 17:09, then numbered with "Denuncia" at 17:44 — same vehicle changing state, counted once as Reservado de Obra |
| 8 | `includeInReport` defaults to `true` for free-text entries; user can toggle per entry | Confirmed | Golden fixture sets two free-text entries to `false` explicitly |
| 9 | Report is sectioned (date → header → towed entries → summary → untowed), not strictly chronological | Confirmed | Matches golden fixture layout |
| 10 | Ticketed emoji defaults to 📱, configurable in Settings | Confirmed | Real screenshot shows 📱, brief text says 🅿️ |
| 11 | No trailing newline in generated report text | Confirmed | Simplifies clipboard/mailto/TXT consumers; arbitrary but must be picked — see report-format.md |
| 12 | Only the date line and the `Hoy N a playa:` line are bold, always (not a preference) | Confirmed | User approval 2026-09-26 |
| 13 | No content heuristics for `includeInReport`; the user toggles it per entry | M1 default | Keep logging fast and predictable |
| 14 | M1 has no drag reordering; order changes by editing `time`. `sortKey` exists for later | M1 default | Golden UX rule: no extra steps |
| 15 | When `N = 0` the summary block is omitted even if untowed entries exist | M1 default | Nothing was towed, so there is nothing to summarize |
| 16 | Background is a preset palette (`Settings.background`), each preset with a light and a dark variant, applied via `data-background` on `<html>`; presets stay low-chroma so text contrast holds ≥4.5:1 | Confirmed | User decision 2026-09-26 |
| 17 | `Settings.userName` is app-only: shown in-app (e.g. a Today header greeting), never included in the generated report | Confirmed | User decision 2026-09-26 |
| 18 | Custom background colors (`Settings.customBackgrounds`): background only (accent out of scope), one light + one dark hex per entry, max 8, deletable; automatic readable text — if the theme's default foreground contrasts <4.5:1 against the chosen background, `--foreground`/`--muted-foreground` are overridden with near-black or near-white (whichever contrasts best), cleared otherwise | Confirmed | User decision 2026-09-26 |

## Open questions

- None blocking M1. Revisit decisions 13–15 after real-world use.
