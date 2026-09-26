import { getEntryTypeConfig } from '@/domain/entryTypeRegistry'
import { computeTowedTotal, computeTypeCounts } from '@/utils/counters'
import { formatDisplayDate } from '@/utils/dates'
import type { Block, LineBlock, ReportDocument, Span } from '@/types/document'
import type { DailyEntry, DailyReport, Settings } from '@/types/schemas'

/**
 * Single source of truth for report text (report-format.md): pure function
 * from DailyReport + DailyEntry[] (+ Settings, for the ticketed emoji and
 * any future per-entry-type settings) to the document model. Both
 * renderers only ever consume this model.
 */

function textLine(text: string): LineBlock {
  return { kind: 'line', spans: [{ kind: 'text', text }] }
}

function boldLine(text: string): LineBlock {
  return { kind: 'line', spans: [{ kind: 'bold', children: [{ kind: 'text', text }] }] }
}

/** Appends " Denuncia." after the formatter output when `denounced` is set — regardless of type. */
function withDenouncedSuffix(spans: Span[], denounced: boolean): Span[] {
  if (!denounced) return spans

  const suffix = ' Denuncia.'
  const lastSpan = spans[spans.length - 1]
  if (lastSpan?.kind === 'text' && !lastSpan.verbatim) {
    return [...spans.slice(0, -1), { ...lastSpan, text: lastSpan.text + suffix }]
  }
  return [...spans, { kind: 'text', text: suffix }]
}

function prependNumber(spans: Span[], n: number): Span[] {
  const prefix = `${n}. `
  const firstSpan = spans[0]
  if (firstSpan?.kind === 'text' && !firstSpan.verbatim) {
    return [{ ...firstSpan, text: prefix + firstSpan.text }, ...spans.slice(1)]
  }
  return [{ kind: 'text', text: prefix }, ...spans]
}

/** Ascending by `time` (HH:mm, lexicographically sortable), then `sortKey`. */
function byTimeThenSortKey(a: DailyEntry, b: DailyEntry): number {
  return a.time.localeCompare(b.time) || a.sortKey - b.sortKey
}

function renderEntryLine(entry: DailyEntry, settings: Settings): LineBlock {
  const config = getEntryTypeConfig(entry.type)
  const spans = withDenouncedSuffix(config.formatter(entry, settings), entry.denounced)
  return { kind: 'line', spans }
}

function buildHeaderSection(report: DailyReport): Block[] {
  if (report.header === '') return []
  // Verbatim, one line block per input line — no reformatting, no bolding.
  return report.header.split('\n').map(textLine)
}

function buildTowedSection(entries: DailyEntry[], settings: Settings): Block[] {
  const towed = entries.filter((entry) => entry.towed).sort(byTimeThenSortKey)
  const blocks: Block[] = []

  towed.forEach((entry, index) => {
    const line = renderEntryLine(entry, settings)
    blocks.push({ kind: 'line', spans: prependNumber(line.spans, index + 1) })
    // Every towed entry (including the last one) is followed by a blank —
    // that trailing blank also serves as the separator before the summary.
    blocks.push({ kind: 'blank' })
  })

  return blocks
}

function buildSummarySection(entries: DailyEntry[]): Block[] {
  const total = computeTowedTotal(entries)
  if (total === 0) return []

  const lines: Block[] = [boldLine(`Hoy ${total} a playa:`)]
  for (const typeCount of computeTypeCounts(entries)) {
    lines.push(textLine(`${typeCount.countedLabel}: ${typeCount.count}`))
  }
  return lines
}

function buildUntowedSection(entries: DailyEntry[], settings: Settings): Block[] {
  return entries
    .filter((entry) => !entry.towed && entry.includeInReport)
    .sort(byTimeThenSortKey)
    .map((entry) => renderEntryLine(entry, settings))
}

export function generateDailyReport(
  report: DailyReport,
  entries: DailyEntry[],
  settings: Settings,
): ReportDocument {
  const sections: Block[][] = [[boldLine(formatDisplayDate(report.date))]]

  const header = buildHeaderSection(report)
  if (header.length > 0) sections.push(header)

  const towed = buildTowedSection(entries, settings)
  if (towed.length > 0) sections.push(towed)

  const summary = buildSummarySection(entries)
  if (summary.length > 0) sections.push(summary)

  const untowed = buildUntowedSection(entries, settings)
  if (untowed.length > 0) sections.push(untowed)

  const blocks: Block[] = []
  sections.forEach((section, index) => {
    if (index > 0) {
      const previousSection = sections[index - 1]
      const previousLast = previousSection?.[previousSection.length - 1]
      if (previousLast?.kind !== 'blank') {
        blocks.push({ kind: 'blank' })
      }
    }
    blocks.push(...section)
  })

  return { blocks }
}
