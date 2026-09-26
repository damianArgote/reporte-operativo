import { Fragment, type ReactNode } from 'react'
import type { Block, Span } from '@/types/document'

/**
 * Renders a ReportDocument's spans/blocks as React elements (preview
 * contract, report-format.md): bold -> <strong>, italic -> <em>,
 * strike -> <s>, mono -> <code>. Never uses dangerouslySetInnerHTML — this
 * walks the same document model the renderers consume, so what's shown
 * here matches what gets copied (plain-text flavor). Shared by the entry
 * list (one entry's line) and the preview sheet (the whole document).
 */

function renderVerbatimText(text: string): ReactNode {
  const lines = text.split('\n')
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ))
}

function renderSpan(span: Span, key: number): ReactNode {
  switch (span.kind) {
    case 'text':
      return <Fragment key={key}>{span.verbatim ? renderVerbatimText(span.text) : span.text}</Fragment>
    case 'bold':
      return <strong key={key}>{renderSpans(span.children)}</strong>
    case 'italic':
      return <em key={key}>{renderSpans(span.children)}</em>
    case 'strike':
      return <s key={key}>{renderSpans(span.children)}</s>
    case 'mono':
      return <code key={key}>{renderSpans(span.children)}</code>
  }
}

export function renderSpans(spans: Span[]): ReactNode {
  return spans.map((span, index) => renderSpan(span, index))
}

export function renderBlocks(blocks: Block[]): ReactNode {
  return blocks.map((block, index) => {
    if (block.kind === 'blank') {
      return <div key={index} className="h-3" aria-hidden="true" />
    }
    return (
      <p key={index} className="whitespace-pre-wrap break-words">
        {renderSpans(block.spans)}
      </p>
    )
  })
}
