import type { Block, ReportDocument, Span } from '@/types/document'

/**
 * Pure renderers over the ReportDocument model (report-format.md). Neither
 * one re-derives report data — both only walk `doc.blocks`.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------
// renderWhatsAppText — text/plain, WhatsApp markup, no escaping.
// ---------------------------------------------------------------------

function spanToWhatsAppText(span: Span): string {
  switch (span.kind) {
    case 'text':
      return span.text
    case 'bold':
      return `*${span.children.map(spanToWhatsAppText).join('')}*`
    case 'italic':
      return `_${span.children.map(spanToWhatsAppText).join('')}_`
    case 'strike':
      return `~${span.children.map(spanToWhatsAppText).join('')}~`
    case 'mono':
      return `\`\`\`${span.children.map(spanToWhatsAppText).join('')}\`\`\``
  }
}

function blockToWhatsAppText(block: Block): string {
  if (block.kind === 'blank') return ''
  return block.spans.map(spanToWhatsAppText).join('')
}

/** text/plain — WhatsApp markup, no trailing newline. */
export function renderWhatsAppText(doc: ReportDocument): string {
  return doc.blocks.map(blockToWhatsAppText).join('\n')
}

// ---------------------------------------------------------------------
// renderHtml — text/html, all user text escaped.
// ---------------------------------------------------------------------

/**
 * Parses WhatsApp markup (`*bold*`, `_italic_`, `~strike~`, `` ```mono``` ``)
 * out of one already-HTML-escaped, newline-free segment of verbatim text.
 * Escaping runs first (see escapeVerbatimSegment below), so these regexes
 * only ever see plain ASCII delimiters — never markup coming from the
 * escaped output of `<`/`>`/`&`/quotes.
 */
function parseWhatsAppMarkup(escapedSegment: string): string {
  return escapedSegment
    .replace(/```(.+?)```/g, (_match, inner: string) => `<code>${inner}</code>`)
    .replace(/\*(.+?)\*/g, (_match, inner: string) => `<b>${inner}</b>`)
    .replace(/_(.+?)_/g, (_match, inner: string) => `<i>${inner}</i>`)
    .replace(/~(.+?)~/g, (_match, inner: string) => `<s>${inner}</s>`)
}

/**
 * Verbatim text (header lines, free-entry rawText) is the one place a
 * renderer parses a text span's content: escape the literal text first,
 * split on embedded newlines (WhatsApp markup never spans a line break),
 * then parse markup per line and rejoin with <br>.
 */
function renderVerbatimTextHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => parseWhatsAppMarkup(escapeHtml(line)))
    .join('<br>')
}

function renderPlainTextHtml(text: string): string {
  return text.split('\n').map(escapeHtml).join('<br>')
}

function spanToHtml(span: Span): string {
  switch (span.kind) {
    case 'text':
      return span.verbatim ? renderVerbatimTextHtml(span.text) : renderPlainTextHtml(span.text)
    case 'bold':
      return `<b>${span.children.map(spanToHtml).join('')}</b>`
    case 'italic':
      return `<i>${span.children.map(spanToHtml).join('')}</i>`
    case 'strike':
      return `<s>${span.children.map(spanToHtml).join('')}</s>`
    case 'mono':
      return `<code>${span.children.map(spanToHtml).join('')}</code>`
  }
}

function blockToHtml(block: Block): string {
  if (block.kind === 'blank') return ''
  return block.spans.map(spanToHtml).join('')
}

/** text/html — all user text escaped; see module docs for the verbatim-markup exception. */
export function renderHtml(doc: ReportDocument): string {
  return doc.blocks.map(blockToHtml).join('<br>')
}
