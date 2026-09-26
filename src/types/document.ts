/**
 * Report document model — see docs/specs/report-format.md.
 *
 * `generateDailyReport()` is the single source of truth that turns a
 * DailyReport + DailyEntry[] into this model; `renderWhatsAppText()` and
 * `renderHtml()` are pure renderers that only walk this model, never
 * re-deriving report data.
 */

/**
 * A plain-text leaf span.
 *
 * `verbatim` marks text that came from user-typed content copied through
 * unparsed (`DailyEntry.rawText` for `free` entries, `DailyReport.header`
 * lines) — per report-format.md, `renderHtml` is the one renderer allowed to
 * parse WhatsApp markup (`*bold*`, `_italic_`, `~strike~`, `` ```mono``` ``)
 * out of such spans, so it can visually match WhatsApp; every other text
 * span (formatter output, the date line, the summary block) is generator-
 * composed and is only ever HTML-escaped, never re-parsed. This flag is not
 * part of the report-format.md sketch; it is an internal-only extension
 * needed to scope that HTML markup-parsing rule to verbatim content only —
 * see the T2 hand-off notes for the full rationale.
 */
export interface TextSpan {
  kind: 'text'
  text: string
  verbatim?: boolean
}

export interface BoldSpan {
  kind: 'bold'
  children: Span[]
}

export interface ItalicSpan {
  kind: 'italic'
  children: Span[]
}

export interface StrikeSpan {
  kind: 'strike'
  children: Span[]
}

export interface MonoSpan {
  kind: 'mono'
  children: Span[]
}

export type Span = TextSpan | BoldSpan | ItalicSpan | StrikeSpan | MonoSpan

/** One logical line. */
export interface LineBlock {
  kind: 'line'
  spans: Span[]
}

/** One blank-line separator between sections/entries. */
export interface BlankBlock {
  kind: 'blank'
}

export type Block = LineBlock | BlankBlock

export interface ReportDocument {
  blocks: Block[]
}
