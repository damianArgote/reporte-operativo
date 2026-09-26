import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import type { DailyEntry } from '@/types/schemas'
import type { Span } from '@/types/document'
import { ENTRY_TYPE_IDS } from '@/types/entryTypeIds'
import { ENTRY_TYPE_ORDER, ENTRY_TYPE_REGISTRY, getEntryTypeConfig } from './entryTypeRegistry'

function makeEntry(overrides: Partial<DailyEntry>): DailyEntry {
  return {
    id: 'e1',
    reportId: 'r1',
    createdAt: 0,
    updatedAt: 0,
    time: '16:05',
    type: 'lp',
    towed: true,
    denounced: false,
    includeInReport: true,
    sortKey: 0,
    fields: {},
    ...overrides,
  }
}

function text(spans: Span[]): string {
  return spans.map((s) => (s.kind === 'text' ? s.text : '')).join('')
}

describe('ENTRY_TYPE_ORDER / registry order', () => {
  it('matches ENTRY_TYPE_IDS order exactly', () => {
    expect(ENTRY_TYPE_ORDER).toEqual(ENTRY_TYPE_IDS)
  })

  it('has one registry entry per id, with a matching id field', () => {
    for (const id of ENTRY_TYPE_IDS) {
      expect(ENTRY_TYPE_REGISTRY[id].id).toBe(id)
    }
  })
})

describe('getEntryTypeConfig', () => {
  it('exposes label, pickerLabel, icon, towedByDefault, countedLabel, fields for every type', () => {
    for (const id of ENTRY_TYPE_IDS) {
      const config = getEntryTypeConfig(id)
      expect(config.label.length).toBeGreaterThan(0)
      expect(config.pickerLabel.length).toBeGreaterThan(0)
      expect(config.icon.length).toBeGreaterThan(0)
      expect(typeof config.towedByDefault).toBe('boolean')
      expect(config.countedLabel.length).toBeGreaterThan(0)
      expect(Array.isArray(config.fields)).toBe(true)
    }
  })

  it('construction has picker label OBRA and counted label Reservado de Obra', () => {
    const config = getEntryTypeConfig('construction')
    expect(config.pickerLabel).toBe('OBRA')
    expect(config.countedLabel).toBe('Reservado de Obra')
  })

  it('lp/mi/construction are towed by default; ticketed/free are not', () => {
    expect(getEntryTypeConfig('lp').towedByDefault).toBe(true)
    expect(getEntryTypeConfig('mi').towedByDefault).toBe(true)
    expect(getEntryTypeConfig('construction').towedByDefault).toBe(true)
    expect(getEntryTypeConfig('ticketed').towedByDefault).toBe(false)
    expect(getEntryTypeConfig('free').towedByDefault).toBe(false)
  })
})

describe('formatters', () => {
  it('lp: "{plate} un LP en {street} {addressNumber}."', () => {
    const entry = makeEntry({
      type: 'lp',
      fields: { plate: 'OHM949', street: 'Av Luis María Campos', addressNumber: '1270' },
    })
    const spans = getEntryTypeConfig('lp').formatter(entry, DEFAULT_SETTINGS)
    expect(text(spans)).toBe('OHM949 un LP en Av Luis María Campos 1270.')
  })

  it('lp: appends observation when present', () => {
    const entry = makeEntry({
      type: 'lp',
      fields: {
        plate: 'OHM949',
        street: 'Av Luis María Campos',
        addressNumber: '1270',
        observation: 'con acoplado',
      },
    })
    const spans = getEntryTypeConfig('lp').formatter(entry, DEFAULT_SETTINGS)
    expect(text(spans)).toBe('OHM949 un LP en Av Luis María Campos 1270. con acoplado')
  })

  it('mi: "{plate} un MI en {street} {addressNumber}."', () => {
    const entry = makeEntry({
      type: 'mi',
      fields: { plate: 'AF293QB', street: 'Larrea', addressNumber: '1168' },
    })
    const spans = getEntryTypeConfig('mi').formatter(entry, DEFAULT_SETTINGS)
    expect(text(spans)).toBe('AF293QB un MI en Larrea 1168.')
  })

  it('construction: "{plate} {vehicle} {street} {addressNumber} {reason}."', () => {
    const entry = makeEntry({
      type: 'construction',
      fields: {
        plate: 'KMB728',
        vehicle: 'Volkswagen',
        street: 'TENIENTE BENJAMIN MATIENZO',
        addressNumber: '1745',
        reason: 'Obra en construccion',
      },
    })
    const spans = getEntryTypeConfig('construction').formatter(entry, DEFAULT_SETTINGS)
    expect(text(spans)).toBe('KMB728 Volkswagen TENIENTE BENJAMIN MATIENZO 1745 Obra en construccion.')
  })

  it('ticketed: "{plate} un {identifier}/{ticketedEmoji} Infraccionado."', () => {
    const entry = makeEntry({
      type: 'ticketed',
      towed: false,
      fields: { plate: 'MEY521', identifier: '6490' },
    })
    const spans = getEntryTypeConfig('ticketed').formatter(entry, DEFAULT_SETTINGS)
    expect(text(spans)).toBe('MEY521 un 6490/📱 Infraccionado.')
  })

  it('ticketed: honors a non-default ticketedEmoji from settings', () => {
    const entry = makeEntry({
      type: 'ticketed',
      towed: false,
      fields: { plate: 'MEY521', identifier: '6490' },
    })
    const spans = getEntryTypeConfig('ticketed').formatter(entry, {
      theme: 'system',
      ticketedEmoji: '🅿️',
      background: 'neutral',
      userName: '',
    })
    expect(text(spans)).toBe('MEY521 un 6490/🅿️ Infraccionado.')
  })

  it('free: rawText verbatim, marked as verbatim for the HTML renderer', () => {
    const entry = makeEntry({
      type: 'free',
      towed: false,
      includeInReport: true,
      fields: {},
      rawText: 'Novedad libre.',
    })
    const spans = getEntryTypeConfig('free').formatter(entry, DEFAULT_SETTINGS)
    expect(spans).toEqual([{ kind: 'text', text: 'Novedad libre.', verbatim: true }])
  })
})
