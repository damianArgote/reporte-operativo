import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  currentTime,
  formatDisplayDate,
  isValidDateKey,
  parseDateKey,
  todayKey,
} from './dates'

describe('todayKey', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns YYYY-MM-DD from local date components', () => {
    const now = new Date(2026, 8, 26, 10, 15, 0) // 2026-09-26 10:15 local
    expect(todayKey(now)).toBe('2026-09-26')
  })

  it('pads single-digit month and day', () => {
    const now = new Date(2026, 0, 5, 0, 0, 0) // 2026-01-05 local
    expect(todayKey(now)).toBe('2026-01-05')
  })

  it('uses the LOCAL calendar date near midnight, not the UTC date', () => {
    // America/Argentina/Buenos_Aires is UTC-3 (fixed, no DST).
    // 2026-09-26 23:30 local is 2026-09-27 02:30 UTC: a UTC-based
    // implementation (e.g. toISOString) would wrongly return the next day.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 26, 23, 30, 0))
    expect(todayKey(new Date())).toBe('2026-09-26')
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-09-27')
  })

  it('defaults to the current local time when no argument is given', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 26, 12, 0, 0))
    expect(todayKey()).toBe('2026-09-26')
  })
})

describe('formatDisplayDate', () => {
  it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatDisplayDate('2026-09-26')).toBe('26/09/2026')
  })

  it('preserves leading zeros', () => {
    expect(formatDisplayDate('2026-01-05')).toBe('05/01/2026')
  })
})

describe('currentTime', () => {
  it('returns HH:mm from local time components', () => {
    const now = new Date(2026, 8, 26, 9, 5, 0)
    expect(currentTime(now)).toBe('09:05')
  })

  it('pads single-digit hours and minutes', () => {
    const now = new Date(2026, 8, 26, 0, 0, 0)
    expect(currentTime(now)).toBe('00:00')
  })
})

describe('isValidDateKey', () => {
  it('accepts a well-formed real calendar date', () => {
    expect(isValidDateKey('2026-09-26')).toBe(true)
  })

  it('rejects a malformed string', () => {
    expect(isValidDateKey('2026/09/26')).toBe(false)
    expect(isValidDateKey('26-09-2026')).toBe(false)
    expect(isValidDateKey('not-a-date')).toBe(false)
  })

  it('rejects an out-of-range month or day', () => {
    expect(isValidDateKey('2026-13-01')).toBe(false)
    expect(isValidDateKey('2026-02-30')).toBe(false)
  })
})

describe('parseDateKey', () => {
  it('returns the numeric year/month/day components', () => {
    expect(parseDateKey('2026-09-26')).toEqual({ year: 2026, month: 9, day: 26 })
  })

  it('throws on an invalid key', () => {
    expect(() => parseDateKey('nope')).toThrow()
  })
})
