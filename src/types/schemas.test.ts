import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  dailyEntrySchema,
  dailyReportSchema,
  entryFieldsSchema,
  settingsSchema,
} from './schemas'

const validEntry = {
  id: 'e1',
  reportId: 'r1',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  time: '16:05',
  type: 'lp',
  towed: true,
  denounced: false,
  includeInReport: true,
  sortKey: 1_700_000_000_000,
  fields: { plate: 'OHM949', street: 'Av Luis María Campos', addressNumber: '1270' },
}

describe('entryFieldsSchema', () => {
  it('accepts a partial set of known fields', () => {
    expect(entryFieldsSchema.parse({ plate: 'ABC123' })).toEqual({ plate: 'ABC123' })
  })

  it('accepts an empty object', () => {
    expect(entryFieldsSchema.parse({})).toEqual({})
  })

  it('rejects an unknown field key', () => {
    expect(() => entryFieldsSchema.parse({ plate: 'ABC123', bogus: 'x' })).toThrow()
  })

  it('rejects a non-string field value', () => {
    expect(() => entryFieldsSchema.parse({ plate: 123 })).toThrow()
  })
})

describe('dailyEntrySchema', () => {
  it('parses a valid towed entry', () => {
    expect(dailyEntrySchema.parse(validEntry)).toEqual(validEntry)
  })

  it('parses a valid free entry with rawText and no towed fields', () => {
    const freeEntry = {
      ...validEntry,
      type: 'free',
      towed: false,
      fields: {},
      rawText: 'Novedad libre *con* markup\ny salto de línea.',
    }
    expect(dailyEntrySchema.parse(freeEntry)).toEqual(freeEntry)
  })

  it('rejects an invalid entry type id', () => {
    expect(() => dailyEntrySchema.parse({ ...validEntry, type: 'bogus' })).toThrow()
  })

  it('rejects a malformed time', () => {
    expect(() => dailyEntrySchema.parse({ ...validEntry, time: '25:99' })).toThrow()
    expect(() => dailyEntrySchema.parse({ ...validEntry, time: '9:5' })).toThrow()
  })

  it('rejects a missing required field', () => {
    const rest: Partial<typeof validEntry> = { ...validEntry }
    delete rest.towed
    expect(() => dailyEntrySchema.parse(rest)).toThrow()
  })

  it('rejects a non-boolean towed flag', () => {
    expect(() => dailyEntrySchema.parse({ ...validEntry, towed: 'yes' })).toThrow()
  })
})

describe('dailyReportSchema', () => {
  const validReport = {
    id: 'r1',
    date: '2026-09-26',
    header: 'G. 28. Ruesga, Bazan.',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  }

  it('parses a valid report', () => {
    expect(dailyReportSchema.parse(validReport)).toEqual(validReport)
  })

  it('rejects a malformed date key', () => {
    expect(() => dailyReportSchema.parse({ ...validReport, date: '26/09/2026' })).toThrow()
  })

  it('rejects an out-of-range calendar date', () => {
    expect(() => dailyReportSchema.parse({ ...validReport, date: '2026-02-30' })).toThrow()
  })
})

describe('settingsSchema', () => {
  it('parses valid settings', () => {
    const settings = { theme: 'dark', ticketedEmoji: '📱', background: 'arena' }
    expect(settingsSchema.parse(settings)).toEqual(settings)
  })

  it('rejects an invalid theme', () => {
    expect(() => settingsSchema.parse({ theme: 'blue', ticketedEmoji: '📱' })).toThrow()
  })

  it('rejects an empty ticketedEmoji', () => {
    expect(() => settingsSchema.parse({ theme: 'system', ticketedEmoji: '' })).toThrow()
  })

  it('defaults background to "neutral" when missing — an old row saved before this field existed', () => {
    const parsed = settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱' })
    expect(parsed.background).toBe('neutral')
  })

  it('rejects an unknown background preset id', () => {
    expect(() => settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱', background: 'bogus' })).toThrow()
  })

  it('exposes a default settings constant matching the schema', () => {
    expect(DEFAULT_SETTINGS).toEqual({ theme: 'system', ticketedEmoji: '📱', background: 'neutral' })
    expect(() => settingsSchema.parse(DEFAULT_SETTINGS)).not.toThrow()
  })
})
