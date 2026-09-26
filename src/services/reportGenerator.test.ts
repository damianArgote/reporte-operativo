import { describe, expect, it } from 'vitest'
import type { DailyEntry, DailyReport, Settings } from '@/types/schemas'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { renderHtml, renderWhatsAppText } from './renderers'
import {
  computeTowedNumbering,
  generateDailyReport,
  renderEntrySpans,
  renderNumberedEntrySpans,
} from './reportGenerator'
import {
  GOLDEN_EXPECTED_WHATSAPP_TEXT,
  goldenEntries,
  goldenReport,
  goldenSettings,
} from './__fixtures__/golden-2026-09-26'

describe('generateDailyReport — golden fixture golden-2026-09-26', () => {
  it('renderWhatsAppText output matches the spec byte-for-byte', () => {
    const doc = generateDailyReport(goldenReport, goldenEntries, goldenSettings)
    expect(renderWhatsAppText(doc)).toBe(GOLDEN_EXPECTED_WHATSAPP_TEXT)
  })
})

describe('generateDailyReport — Settings.userName never leaks into the report (T3, domain.md Decisions #17)', () => {
  it('renderWhatsAppText is byte-for-byte identical whether userName is set or empty', () => {
    const withName = generateDailyReport(goldenReport, goldenEntries, {
      ...goldenSettings,
      userName: 'Cualquier Nombre',
    })
    const withoutName = generateDailyReport(goldenReport, goldenEntries, { ...goldenSettings, userName: '' })

    expect(renderWhatsAppText(withName)).toBe(renderWhatsAppText(withoutName))
    expect(renderWhatsAppText(withName)).toBe(GOLDEN_EXPECTED_WHATSAPP_TEXT)
  })
})

describe('generateDailyReport — derived Given/When/Then cases (report-format.md)', () => {
  it('deleting a towed entry renumbers 1..N-1 and drops its type from the summary if it hits zero', () => {
    const entriesWithoutEntry3 = goldenEntries.filter((e) => e.id !== 'entry-1744-construction-towed')
    const doc = generateDailyReport(goldenReport, entriesWithoutEntry3, goldenSettings)
    const text = renderWhatsAppText(doc)

    expect(text).toContain('1. OHM949 un LP en Av Luis María Campos 1270.')
    expect(text).toContain('5. AF293QB un MI en Larrea 1168.')
    expect(text).not.toContain('6.')
    expect(text).toContain('*Hoy 5 a playa:*')
    expect(text).toContain('LP: 4')
    expect(text).toContain('MI: 1')
    expect(text).not.toContain('Reservado de Obra')
  })

  it('an empty report with no header renders only the bold date line', () => {
    const report: DailyReport = {
      id: 'r-empty',
      date: '2026-09-26',
      header: '',
      createdAt: 0,
      updatedAt: 0,
    }
    const doc = generateDailyReport(report, [], DEFAULT_SETTINGS)
    expect(renderWhatsAppText(doc)).toBe('*26/09/2026*')
  })

  it('an empty report with a header renders the date line plus header lines, nothing else', () => {
    const report: DailyReport = {
      id: 'r-empty-header',
      date: '2026-09-26',
      header: 'Turno tranquilo.',
      createdAt: 0,
      updatedAt: 0,
    }
    const doc = generateDailyReport(report, [], DEFAULT_SETTINGS)
    expect(renderWhatsAppText(doc)).toBe('*26/09/2026*\n\nTurno tranquilo.')
  })

  it('toggling an untowed entry to towed gives it the correct sequential number (by time) and increments its counter and N', () => {
    const baseEntries = goldenEntries.filter(
      (e) => e.id !== 'entry-1633-ticketed' && e.type !== 'free',
    )
    const before = generateDailyReport(goldenReport, baseEntries, goldenSettings)
    expect(renderWhatsAppText(before)).toContain('*Hoy 6 a playa:*')

    // The ticketed entry sits at 16:33 — between the 16:05 and 16:53 towed
    // entries — so once towed it becomes entry #2, not appended at the end.
    const ticketedEntry = goldenEntries.find((e) => e.id === 'entry-1633-ticketed')!
    const withToggled = [...baseEntries, { ...ticketedEntry, towed: true }]

    const after = generateDailyReport(goldenReport, withToggled, goldenSettings)
    const afterText = renderWhatsAppText(after)
    expect(afterText).toContain('*Hoy 7 a playa:*')
    expect(afterText).toContain('Infraccionado: 1')
    expect(afterText).toContain('1. OHM949 un LP en Av Luis María Campos 1270.')
    expect(afterText).toContain('2. MEY521 un 6490/📱 Infraccionado.')
    expect(afterText).toContain('3. HHR132 un LP en Av Luis María Campos 1307.')
  })

  it('changing a towed entry from lp to mi shifts the counters but leaves N unchanged', () => {
    const entries: DailyEntry[] = goldenEntries.map((e) =>
      e.id === 'entry-1605-lp' ? { ...e, type: 'mi' } : e,
    )
    const doc = generateDailyReport(goldenReport, entries, goldenSettings)
    const text = renderWhatsAppText(doc)
    expect(text).toContain('*Hoy 6 a playa:*')
    expect(text).toContain('LP: 3')
    expect(text).toContain('MI: 2')
  })

  it('renders a free entry rawText with markup/emoji/newlines byte-for-byte via renderWhatsAppText', () => {
    const settings: Settings = DEFAULT_SETTINGS
    const report: DailyReport = { id: 'r', date: '2026-09-26', header: '', createdAt: 0, updatedAt: 0 }
    const rawText = 'Aviso 🚨 con *negrita* y\nsalto de línea, todo tal cual.'
    const entries: DailyEntry[] = [
      {
        id: 'e1',
        reportId: 'r',
        createdAt: 1,
        updatedAt: 1,
        time: '10:00',
        type: 'free',
        towed: false,
        denounced: false,
        includeInReport: true,
        sortKey: 1,
        fields: {},
        rawText,
      },
    ]
    const doc = generateDailyReport(report, entries, settings)
    expect(renderWhatsAppText(doc)).toBe(`*26/09/2026*\n\n${rawText}`)
  })

  it('escapes a <script> free entry via renderHtml and never emits an executable tag', () => {
    const report: DailyReport = { id: 'r', date: '2026-09-26', header: '', createdAt: 0, updatedAt: 0 }
    const entries: DailyEntry[] = [
      {
        id: 'e1',
        reportId: 'r',
        createdAt: 1,
        updatedAt: 1,
        time: '10:00',
        type: 'free',
        towed: false,
        denounced: false,
        includeInReport: true,
        sortKey: 1,
        fields: {},
        rawText: '<script>alert(1)</script>',
      },
    ]
    const doc = generateDailyReport(report, entries, DEFAULT_SETTINGS)
    const html = renderHtml(doc)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert')
  })

  it('never emits two consecutive blank blocks', () => {
    const doc = generateDailyReport(goldenReport, goldenEntries, goldenSettings)
    for (let i = 0; i < doc.blocks.length - 1; i++) {
      const blockIsBlank = doc.blocks[i]?.kind === 'blank'
      const nextIsBlank = doc.blocks[i + 1]?.kind === 'blank'
      expect(blockIsBlank && nextIsBlank).toBe(false)
    }
  })
})

describe('computeTowedNumbering', () => {
  it('assigns 1..N in the same time+sortKey order the generator uses, ignoring untowed entries', () => {
    const numbering = computeTowedNumbering(goldenEntries)

    expect(numbering.get('entry-1605-lp')).toBe(1)
    expect(numbering.get('entry-1653-lp')).toBe(2)
    expect(numbering.get('entry-1744-construction-towed')).toBe(3)
    expect(numbering.get('entry-1831-lp')).toBe(4)
    expect(numbering.get('entry-2030-lp')).toBe(5)
    expect(numbering.get('entry-2122-mi')).toBe(6)
    // Untowed entries never receive a number.
    expect(numbering.has('entry-1633-ticketed')).toBe(false)
  })

  it('renumbers 1..N-1 when a towed entry is removed, matching generateDailyReport', () => {
    const withoutEntry3 = goldenEntries.filter((e) => e.id !== 'entry-1744-construction-towed')
    const numbering = computeTowedNumbering(withoutEntry3)

    expect(numbering.get('entry-1831-lp')).toBe(3)
    expect(numbering.get('entry-2030-lp')).toBe(4)
    expect(numbering.get('entry-2122-mi')).toBe(5)
  })

  it('returns an empty map when there are no towed entries', () => {
    expect(computeTowedNumbering([]).size).toBe(0)
  })
})

describe('renderEntrySpans / renderNumberedEntrySpans (single-entry rendering, no number prefix)', () => {
  it('renders the same spans generateDailyReport uses for that entry, including the denounced suffix', () => {
    const denounced = goldenEntries.find((e) => e.id === 'entry-1744-construction-towed')!
    const spans = renderEntrySpans(denounced, goldenSettings)
    expect(spans).toEqual([
      {
        kind: 'text',
        text: 'KMB728 Volkswagen TENIENTE BENJAMIN MATIENZO 1745 Obra en construccion. Denuncia.',
      },
    ])
  })

  it('renderNumberedEntrySpans prepends "N. " using the same rule generateDailyReport uses', () => {
    const entry = goldenEntries.find((e) => e.id === 'entry-1605-lp')!
    const spans = renderNumberedEntrySpans(entry, goldenSettings, 1)
    expect(spans).toEqual([{ kind: 'text', text: '1. OHM949 un LP en Av Luis María Campos 1270.' }])
  })
})
