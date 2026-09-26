/**
 * Local-date helpers.
 *
 * All keys are derived from the LOCAL calendar components of a `Date`
 * (getFullYear/getMonth/getDate/getHours/getMinutes), never from
 * `toISOString()` or any other UTC-based conversion — per domain.md
 * invariant 6, dates are the local calendar date, never a UTC one.
 */

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** 'YYYY-MM-DD' from the LOCAL calendar date of `now`. */
export function todayKey(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = pad2(now.getMonth() + 1)
  const day = pad2(now.getDate())
  return `${year}-${month}-${day}`
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' for display. */
export function formatDisplayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-')
  return `${day}/${month}/${year}`
}

/** 'HH:mm' from the LOCAL time components of `now`. */
export function currentTime(now: Date = new Date()): string {
  const hours = pad2(now.getHours())
  const minutes = pad2(now.getMinutes())
  return `${hours}:${minutes}`
}

/** True when `key` is a well-formed 'YYYY-MM-DD' string naming a real date. */
export function isValidDateKey(key: string): boolean {
  if (!DATE_KEY_PATTERN.test(key)) return false

  const [yearStr, monthStr, dayStr] = key.split('-') as [string, string, string]
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false

  // Reject dates that don't round-trip (e.g. 2026-02-30): the Date
  // constructor normalizes out-of-range days into the next month instead
  // of throwing.
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

export interface DateKeyParts {
  year: number
  month: number
  day: number
}

/** Numeric year/month/day from a 'YYYY-MM-DD' key. Throws if invalid. */
export function parseDateKey(key: string): DateKeyParts {
  if (!isValidDateKey(key)) {
    throw new Error(`Invalid date key: ${key}`)
  }
  const [year, month, day] = key.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}
