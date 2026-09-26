# Report Format Spec

Source of truth for the document model, section/whitespace rules, both
renderers, and the clipboard/share/export contracts. Read this before
touching `services/reportGenerator`, `services/renderers`, or `types/`.

## Document model (TypeScript sketch)

```ts
type Span =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: Span[] }
  | { kind: 'italic'; children: Span[] }
  | { kind: 'strike'; children: Span[] }
  | { kind: 'mono'; children: Span[] };

type Block =
  | { kind: 'line'; spans: Span[] }   // one logical line
  | { kind: 'blank' };                 // one blank line separator

interface ReportDocument {
  blocks: Block[];
}

// Single source of truth. Pure function: DailyReport + DailyEntry[] -> doc model.
declare function generateDailyReport(report: DailyReport, entries: DailyEntry[]): ReportDocument;

// Pure renderers consume the doc model only. Neither one re-derives report data.
declare function renderWhatsAppText(doc: ReportDocument): string; // text/plain, WhatsApp markup
declare function renderHtml(doc: ReportDocument): string;         // text/html, escaped user text
```

Emojis (e.g. 📱) are plain Unicode characters inside `text` spans — not a
separate span kind.

## Section order

1. Date line (bold), format `DD/MM/YYYY`.
2. Blank line.
3. Day header — free-text lines from `DailyReport.header`, verbatim, one
   `line` block per input line (no reformatting, no bolding).
4. Blank line.
5. Towed entries, numbered `1..N` in order, each entry's line(s) followed by
   a blank line separator (including after the last one, before the summary
   — see golden fixture).
6. Summary block (see below).
7. Blank line.
8. Untowed entries with `includeInReport === true`, in time order, one per
   line, no numbering.

Any section with no content is fully omitted — it contributes zero blocks,
including its blank-line separators. The generator never emits two
consecutive blank blocks.

## Whitespace rules

- No trailing whitespace on any line.
- No duplicate blank lines anywhere in the output.
- **No trailing newline** at the end of the rendered text (decision: chosen
  over a single trailing newline, to keep clipboard/mailto/TXT output
  identical and avoid an extra blank line when concatenated into WhatsApp).
- `rawText` (free entries) and `header` lines are emitted **verbatim**,
  including any embedded newlines, WhatsApp markup characters, or emoji the
  user typed — the generator never parses or reformats them.

## Summary block

- Omitted entirely when `N = 0` (no towed entries).
- First line (bold): `Hoy N a playa:` where `N` = total towed entry count.
- Then one line per entry-type in **registry order** (`lp`, `mi`,
  `construction`, ...) whose towed count is `> 0`, formatted
  `{countedLabel}: {count}`. Types with count `0` are omitted, not shown as
  `0`.
- Counted labels: `LP`, `MI`, `Reservado de Obra` (per the entry-type
  registry; `ticketed` and `free` are never towed by default and contribute
  nothing to this block unless a user manually marks one as towed, in which
  case it is not part of the current counted-label set and is out of scope
  for M1).

## Renderers

### `renderWhatsAppText(doc)` — text/plain

Maps span kinds to WhatsApp markup:

| span kind | markup |
|---|---|
| bold | `*text*` |
| italic | `_text_` |
| strike | `~text~` |
| mono | `` ```text``` `` |

No escaping is performed — WhatsApp markup characters typed by the user in
`rawText`/`header` pass through byte-for-byte, since those spans are plain
`text` spans, not re-parsed.

### `renderHtml(doc)` — text/html

Maps span kinds to HTML tags: bold → `<b>`, italic → `<i>`, strike → `<s>`,
mono → `<code>`. Line blocks join with `<br>` within a paragraph-like group,
or `<p>` per block — implementation detail, but **all user-supplied text is
HTML-escaped** (`&`, `<`, `>`, `"`, `'`) before insertion.

For `rawText`/`header` content specifically: since `renderWhatsAppText` does
not parse WhatsApp markup out of these spans, `renderHtml` additionally
parses *only* WhatsApp markup (`*bold*`, `_italic_`, `~strike~`,
`` ```mono``` ``) inside verbatim text spans into HTML tags, applying HTML
escaping to the literal text content first and never to the markup
delimiters' resulting tags. This is the one place where a renderer does
light parsing of a `text` span's content, and it exists only to make the
HTML clipboard flavor visually match what WhatsApp itself would render from
the same markup.

Never use `dangerouslySetInnerHTML` in the preview component — the preview
walks the `ReportDocument` model directly and renders React elements per
span kind.

## Clipboard contract

Primary action: copy writes **both** flavors at once:

```ts
navigator.clipboard.write([
  new ClipboardItem({
    'text/plain': new Blob([renderWhatsAppText(doc)], { type: 'text/plain' }),
    'text/html': new Blob([renderHtml(doc)], { type: 'text/html' }),
  }),
]);
```

Fallback (older browsers / permission failure): `navigator.clipboard.writeText(plain)`.

## Consumers

| consumer | source render | notes |
|---|---|---|
| Clipboard copy (primary) | both `renderWhatsAppText` + `renderHtml` | via `ClipboardItem`; `writeText(plain)` fallback |
| Web Share | `renderWhatsAppText` (plain) | `navigator.share({ title, text: plain })` |
| mailto | `renderWhatsAppText` (plain) | subject `Registro diario - DD/MM/YYYY`, body = plain |
| TXT export | `renderWhatsAppText` (plain) | plain text file, same bytes as clipboard plain flavor |
| WhatsApp deep link (`wa.me?text=`) | `renderWhatsAppText` (plain) | optional fallback only, with a warning note — puts plate data in a URL; Web Share is preferred |

## Preview contract

The in-app preview renders `ReportDocument` blocks/spans directly as React
elements (bold → `<strong>`, etc.), applying the same section/whitespace
model the renderers use, so what the user sees matches what gets copied.
Never renders through `renderHtml` + `dangerouslySetInnerHTML`.

## Golden fixture — `golden-2026-09-26`

Source: real screenshot, report date 26/09/2026.

**Header** (`DailyReport.header`, verbatim, 3 lines):

```
G. 28. Ruesga, Bazan. 19hs descanso.
Luis María Campos hoy.
Segundo turno Zabala 1700 al 1900.
```

**Entries** (time, type, towed, include, data):

| time | type | towed | denounced | include | data |
|---|---|---|---|---|---|
| 16:05 | lp | true | — | true | plate `OHM949`, street `Av Luis María Campos`, addressNumber `1270` |
| 16:19 | free | false | — | false | raw: `Chicos les paso una patente para respetar\nKYZ392 en Paraguay 2570 . *No remover* por favor gracias.` |
| 16:33 | ticketed | false | — | true | plate `MEY521`, identifier `6490` |
| 16:53 | lp | true | — | true | plate `HHR132`, street `Av Luis María Campos`, addressNumber `1307` |
| 17:09 | construction | false | — | false | plate `KMB728`, vehicle `Volkswagen`, street `TENIENTE BENJAMIN MATIENZO`, addressNumber `1745`, reason `Obra en construccion` |
| 17:18 | free | false | — | false | raw: `Luis María Campos al 1300 NO HAY CARTELERÍA.` |
| 17:44 | construction | true | true | true | plate `KMB728`, vehicle `Volkswagen`, street `TENIENTE BENJAMIN MATIENZO`, addressNumber `1745`, reason `Obra en construccion` |
| 18:31 | lp | true | — | true | plate `AB921VH`, street `Av Luis María Campos`, addressNumber `1525` |
| 20:30 | lp | true | — | true | plate `AF020JK`, street `Av Luis María Campos`, addressNumber `805` |
| 21:22 | mi | true | — | true | plate `AF293QB`, street `Larrea`, addressNumber `1168` |

**Expected `renderWhatsAppText(generateDailyReport(...))` output, exactly:**

```
*26/09/2026*

G. 28. Ruesga, Bazan. 19hs descanso.
Luis María Campos hoy.
Segundo turno Zabala 1700 al 1900.

1. OHM949 un LP en Av Luis María Campos 1270.

2. HHR132 un LP en Av Luis María Campos 1307.

3. KMB728 Volkswagen TENIENTE BENJAMIN MATIENZO 1745 Obra en construccion. Denuncia.

4. AB921VH un LP en Av Luis María Campos 1525.

5. AF020JK un LP en Av Luis María Campos 805.

6. AF293QB un MI en Larrea 1168.

*Hoy 6 a playa:*
LP: 4
MI: 1
Reservado de Obra: 1

MEY521 un 6490/📱 Infraccionado.
```

Notes on this fixture:

- Both untowed `free` entries (16:19, 17:18) have `includeInReport = false`
  and are correctly absent from the output entirely.
- The untowed `construction` entry at 17:09 (KMB728, `includeInReport =
  false`) is also absent — it is the *pre-tow* state of the same vehicle;
  only its later towed+denounced state (17:44) is rendered, as entry #3.
- The `ticketed` entry (MEY521) is untowed, `includeInReport = true`, and
  appears in the untowed section at the end, using the default
  `ticketedEmoji` (📱).
- Entry #3's line demonstrates the `denounced` flag appending ` Denuncia.`
  after the normal `construction` formatter output.

## Derived test cases (Given/When/Then)

- **Given** the golden fixture, **when** entry #3 (KMB728, 17:44) is
  deleted, **then** towed entries renumber to `1..5`, the summary becomes
  `LP: 4` / `MI: 1` (Reservado de Obra omitted, count 0), and the header
  line reads `*Hoy 5 a playa:*`.
- **Given** a report with no entries, **when** rendered, **then** the output
  is only the bold date line (plus header lines if `header` is non-empty);
  the summary block and both entry sections are fully omitted.
- **Given** an untowed entry, **when** its `towed` flag is toggled to
  `true`, **then** it receives the next sequential number and its type's
  counter increments by 1, and `N` in `Hoy N a playa:` increments by 1.
- **Given** a towed entry of type `lp`, **when** its `type` is changed to
  `mi`, **then** the `LP` counter decrements by 1 and the `MI` counter
  increments by 1; `N` is unchanged.
- **Given** a `free` entry with WhatsApp markup, embedded emoji, and
  embedded newlines in `rawText`, **when** rendered via
  `renderWhatsAppText`, **then** the text is reproduced byte-for-byte with
  no escaping or reformatting.
- **Given** a `free` entry whose `rawText` contains `<script>alert(1)</script>`,
  **when** rendered via `renderHtml`, **then** the output contains the
  HTML-escaped form (`&lt;script&gt;...`) and never an executable tag.
- **Given** a device set to `America/Argentina/Buenos_Aires`, **when** an
  entry is created at 23:30 local time, **then** it is stored under the same
  local `YYYY-MM-DD` date key as the rest of that day's entries, regardless
  of the UTC date at that instant.
