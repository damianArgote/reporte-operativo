import { describe, expect, it } from 'vitest'
import type { ReportDocument } from '@/types/document'
import { renderHtml, renderWhatsAppText } from './renderers'

describe('renderWhatsAppText', () => {
  it('renders a plain text line', () => {
    const doc: ReportDocument = {
      blocks: [{ kind: 'line', spans: [{ kind: 'text', text: 'Hola mundo' }] }],
    }
    expect(renderWhatsAppText(doc)).toBe('Hola mundo')
  })

  it('maps bold/italic/strike/mono spans to WhatsApp markup', () => {
    const doc: ReportDocument = {
      blocks: [
        {
          kind: 'line',
          spans: [
            { kind: 'bold', children: [{ kind: 'text', text: 'negrita' }] },
            { kind: 'text', text: ' y ' },
            { kind: 'italic', children: [{ kind: 'text', text: 'cursiva' }] },
            { kind: 'text', text: ' y ' },
            { kind: 'strike', children: [{ kind: 'text', text: 'tachado' }] },
            { kind: 'text', text: ' y ' },
            { kind: 'mono', children: [{ kind: 'text', text: 'monoespaciado' }] },
          ],
        },
      ],
    }
    expect(renderWhatsAppText(doc)).toBe(
      '*negrita* y _cursiva_ y ~tachado~ y ```monoespaciado```',
    )
  })

  it('renders a blank block as an empty line and joins blocks with a single newline', () => {
    const doc: ReportDocument = {
      blocks: [
        { kind: 'line', spans: [{ kind: 'text', text: 'línea 1' }] },
        { kind: 'blank' },
        { kind: 'line', spans: [{ kind: 'text', text: 'línea 2' }] },
      ],
    }
    expect(renderWhatsAppText(doc)).toBe('línea 1\n\nlínea 2')
  })

  it('never emits a trailing newline', () => {
    const doc: ReportDocument = {
      blocks: [{ kind: 'line', spans: [{ kind: 'text', text: 'última línea' }] }],
    }
    expect(renderWhatsAppText(doc).endsWith('\n')).toBe(false)
  })

  it('does not escape or reparse markup characters typed in verbatim text', () => {
    const doc: ReportDocument = {
      blocks: [
        {
          kind: 'line',
          spans: [
            {
              kind: 'text',
              verbatim: true,
              text: 'KYZ392 en Paraguay 2570 . *No remover* por favor gracias.',
            },
          ],
        },
      ],
    }
    expect(renderWhatsAppText(doc)).toBe(
      'KYZ392 en Paraguay 2570 . *No remover* por favor gracias.',
    )
  })

  it('reproduces embedded newlines inside a single verbatim span byte-for-byte', () => {
    const doc: ReportDocument = {
      blocks: [
        {
          kind: 'line',
          spans: [
            {
              kind: 'text',
              verbatim: true,
              text: 'Chicos les paso una patente\nKYZ392 en Paraguay 2570.',
            },
          ],
        },
      ],
    }
    expect(renderWhatsAppText(doc)).toBe('Chicos les paso una patente\nKYZ392 en Paraguay 2570.')
  })
})

describe('renderHtml', () => {
  it('maps bold to <b> and escapes the inner text', () => {
    const doc: ReportDocument = {
      blocks: [
        { kind: 'line', spans: [{ kind: 'bold', children: [{ kind: 'text', text: '26/09/2026' }] }] },
      ],
    }
    expect(renderHtml(doc)).toContain('<b>26/09/2026</b>')
  })

  it('HTML-escapes plain user text (&, <, >, ", \')', () => {
    const doc: ReportDocument = {
      blocks: [
        { kind: 'line', spans: [{ kind: 'text', text: `Tom & Jerry <3 "quotes" 'single'` }] },
      ],
    }
    expect(renderHtml(doc)).toContain('Tom &amp; Jerry &lt;3 &quot;quotes&quot; &#39;single&#39;')
  })

  it('escapes a <script> injection attempt and never emits an executable tag', () => {
    const doc: ReportDocument = {
      blocks: [
        {
          kind: 'line',
          spans: [{ kind: 'text', verbatim: true, text: '<script>alert(1)</script>' }],
        },
      ],
    }
    const html = renderHtml(doc)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('preserves newlines (as line breaks) inside a verbatim span', () => {
    const doc: ReportDocument = {
      blocks: [
        {
          kind: 'line',
          spans: [{ kind: 'text', verbatim: true, text: 'línea 1\nlínea 2' }],
        },
      ],
    }
    const html = renderHtml(doc)
    expect(html).toContain('línea 1')
    expect(html).toContain('línea 2')
    expect(html).toContain('<br>')
  })

  it('parses WhatsApp markup inside verbatim text into HTML tags, escaping literal text first', () => {
    const doc: ReportDocument = {
      blocks: [
        {
          kind: 'line',
          spans: [
            {
              kind: 'text',
              verbatim: true,
              text: '*No remover* por favor <b>fake</b> gracias _ya_ ~fue~ ```code```',
            },
          ],
        },
      ],
    }
    const html = renderHtml(doc)
    expect(html).toContain('<b>No remover</b>')
    expect(html).toContain('&lt;b&gt;fake&lt;/b&gt;')
    expect(html).toContain('<i>ya</i>')
    expect(html).toContain('<s>fue</s>')
    expect(html).toContain('<code>code</code>')
  })

  it('does not parse markup in non-verbatim (generator-composed) text', () => {
    const doc: ReportDocument = {
      blocks: [{ kind: 'line', spans: [{ kind: 'text', text: 'OHM949 un *LP* en Calle 100.' }] }],
    }
    const html = renderHtml(doc)
    expect(html).toContain('OHM949 un *LP* en Calle 100.')
    expect(html).not.toContain('<b>LP</b>')
  })
})
