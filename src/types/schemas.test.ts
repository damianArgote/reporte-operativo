import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  customBackgroundSchema,
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

describe('customBackgroundSchema', () => {
  const valid = { id: 'custom-11111111-1111-4111-8111-111111111111', light: '#fafafa', dark: '#222222' }

  it('parses a valid custom background', () => {
    expect(customBackgroundSchema.parse(valid)).toEqual(valid)
  })

  it('lowercase-normalizes uppercase hex values', () => {
    const parsed = customBackgroundSchema.parse({ ...valid, light: '#FAFAFA', dark: '#ABCDEF' })
    expect(parsed.light).toBe('#fafafa')
    expect(parsed.dark).toBe('#abcdef')
  })

  it('rejects a malformed hex value', () => {
    expect(() => customBackgroundSchema.parse({ ...valid, light: 'fafafa' })).toThrow()
    expect(() => customBackgroundSchema.parse({ ...valid, dark: '#fff' })).toThrow()
  })

  it('rejects an id that is not "custom-<uuid>"', () => {
    expect(() => customBackgroundSchema.parse({ ...valid, id: 'arena' })).toThrow()
    expect(() => customBackgroundSchema.parse({ ...valid, id: 'custom-not-a-uuid' })).toThrow()
  })
})

describe('settingsSchema', () => {
  it('parses valid settings', () => {
    const settings = {
      theme: 'dark',
      ticketedEmoji: '📱',
      background: 'arena',
      userName: 'Damian',
      customBackgrounds: [],
    }
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

  it('falls back an unknown/stale background preset id to "neutral" at parse time', () => {
    const parsed = settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱', background: 'bogus' })
    expect(parsed.background).toBe('neutral')
  })

  it('defaults customBackgrounds to [] when missing — an old row saved before this field existed', () => {
    const parsed = settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱' })
    expect(parsed.customBackgrounds).toEqual([])
  })

  it('accepts a background that matches an existing custom background id', () => {
    const customBackgrounds = [
      { id: 'custom-11111111-1111-4111-8111-111111111111', light: '#fafafa', dark: '#222222' },
    ]
    const parsed = settingsSchema.parse({
      theme: 'system',
      ticketedEmoji: '📱',
      background: 'custom-11111111-1111-4111-8111-111111111111',
      customBackgrounds,
    })
    expect(parsed.background).toBe('custom-11111111-1111-4111-8111-111111111111')
  })

  it('falls back to "neutral" when background points at a custom id that has since been deleted', () => {
    const parsed = settingsSchema.parse({
      theme: 'system',
      ticketedEmoji: '📱',
      background: 'custom-99999999-9999-4999-8999-999999999999',
      customBackgrounds: [],
    })
    expect(parsed.background).toBe('neutral')
  })

  it('rejects more than 8 custom backgrounds', () => {
    const customBackgrounds = Array.from({ length: 9 }, (_, i) => ({
      id: `custom-${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
      light: '#fafafa',
      dark: '#222222',
    }))
    expect(() => settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱', customBackgrounds })).toThrow()
  })

  it('accepts exactly 8 custom backgrounds', () => {
    const customBackgrounds = Array.from({ length: 8 }, (_, i) => ({
      id: `custom-${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
      light: '#fafafa',
      dark: '#222222',
    }))
    expect(
      settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱', customBackgrounds }).customBackgrounds,
    ).toHaveLength(8)
  })

  it('defaults userName to "" when missing — an old row saved before this field existed', () => {
    const parsed = settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱' })
    expect(parsed.userName).toBe('')
  })

  it('trims userName', () => {
    const parsed = settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱', userName: '  Damian  ' })
    expect(parsed.userName).toBe('Damian')
  })

  it('rejects a userName longer than 40 characters', () => {
    expect(() =>
      settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱', userName: 'a'.repeat(41) }),
    ).toThrow()
  })

  it('accepts a userName of exactly 40 characters', () => {
    const userName = 'a'.repeat(40)
    expect(settingsSchema.parse({ theme: 'system', ticketedEmoji: '📱', userName }).userName).toBe(userName)
  })

  it('exposes a default settings constant matching the schema', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'system',
      ticketedEmoji: '📱',
      background: 'neutral',
      userName: '',
      customBackgrounds: [],
    })
    expect(() => settingsSchema.parse(DEFAULT_SETTINGS)).not.toThrow()
  })
})
