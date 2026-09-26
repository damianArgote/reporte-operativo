import type { EntryFields } from '@/types/schemas'

/**
 * Input normalization (domain.md invariant 5): plates are uppercased and
 * trimmed; other structured fields have internal whitespace collapsed.
 * `rawText` (free-type entries) and `DailyReport.header` are never touched
 * by any of this — they are emitted verbatim, per report-format.md.
 */

export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase()
}

/** Trims and collapses any run of whitespace (spaces, tabs, newlines) to one space. */
export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

const COLLAPSED_FIELD_KEYS = [
  'vehicle',
  'identifier',
  'street',
  'addressNumber',
  'reason',
  'observation',
] as const satisfies readonly (keyof EntryFields)[]

/** Applies the field-level normalization rules to a DailyEntry.fields record. */
export function normalizeEntryFields(fields: EntryFields): EntryFields {
  const result: EntryFields = { ...fields }

  if (result.plate !== undefined) {
    result.plate = normalizePlate(result.plate)
  }

  for (const key of COLLAPSED_FIELD_KEYS) {
    const value = result[key]
    if (value !== undefined) {
      result[key] = collapseWhitespace(value)
    }
  }

  return result
}
