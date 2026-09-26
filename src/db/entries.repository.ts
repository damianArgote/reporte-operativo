import { getEntryTypeConfig } from '@/domain/entryTypeRegistry'
import { normalizeEntryFields } from '@/domain/normalization'
import { dailyEntrySchema, type DailyEntry, type EntryFields } from '@/types/schemas'
import type { EntryTypeId } from '@/types/entryTypeIds'
import { currentTime } from '@/utils/dates'
import { getDatabase } from './database'

/**
 * Entries repository (domain.md "Persistence rules"). Validates with
 * dailyEntrySchema on every write and every read; a corrupt row throws
 * rather than being silently accepted.
 */

function parseEntry(raw: unknown): DailyEntry {
  const result = dailyEntrySchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Corrupt DailyEntry row: ${result.error.message}`)
  }
  return result.data
}

/** Ascending by `time` (HH:mm), then `sortKey` — matches reportGenerator's ordering. */
function byTimeThenSortKey(a: DailyEntry, b: DailyEntry): number {
  return a.time.localeCompare(b.time) || a.sortKey - b.sortKey
}

export async function listByReport(reportId: string): Promise<DailyEntry[]> {
  const db = getDatabase()
  const rows = await db.entries.where('reportId').equals(reportId).toArray()
  return rows.map(parseEntry).sort(byTimeThenSortKey)
}

export interface CreateEntryInput {
  reportId: string
  type: EntryTypeId
  towed?: boolean
  denounced?: boolean
  includeInReport?: boolean
  time?: string
  fields?: EntryFields
  rawText?: string
  sortKey?: number
}

/** Assigns each optional key only when defined, so unset fields are never stored as literal `undefined`. */
function withDefined<T extends object, K extends string, V>(
  base: T,
  key: K,
  value: V | undefined,
): T & Partial<Record<K, V>> {
  return value === undefined ? base : { ...base, [key]: value }
}

export async function create(input: CreateEntryInput): Promise<DailyEntry> {
  const db = getDatabase()
  const now = Date.now()

  const base = {
    id: crypto.randomUUID(),
    reportId: input.reportId,
    createdAt: now,
    updatedAt: now,
    time: input.time ?? currentTime(),
    type: input.type,
    towed: input.towed ?? getEntryTypeConfig(input.type).towedByDefault,
    denounced: input.denounced ?? false,
    includeInReport: input.includeInReport ?? true,
    sortKey: input.sortKey ?? now,
    fields: normalizeEntryFields(input.fields ?? {}),
  }
  const entry = parseEntry(withDefined(base, 'rawText', input.rawText))

  await db.entries.add(entry)
  return entry
}

export type UpdateEntryPatch = Partial<
  Pick<
    DailyEntry,
    | 'time'
    | 'type'
    | 'towed'
    | 'denounced'
    | 'includeInReport'
    | 'fields'
    | 'rawText'
    | 'sortKey'
  >
>

export async function update(id: string, patch: UpdateEntryPatch): Promise<DailyEntry> {
  const db = getDatabase()
  const existing = await db.entries.get(id)
  if (!existing) {
    throw new Error(`Entry not found: ${id}`)
  }
  const current = parseEntry(existing)

  const merged: DailyEntry = {
    ...current,
    ...patch,
    fields: patch.fields ? normalizeEntryFields(patch.fields) : current.fields,
    updatedAt: Date.now(),
  }
  const validated = parseEntry(merged)

  await db.entries.put(validated)
  return validated
}

export async function remove(id: string): Promise<void> {
  await getDatabase().entries.delete(id)
}

/**
 * Re-adds a previously removed entry with its exact original data — the
 * undo path for `remove()` (e.g. a "Deshacer" toast action). Unlike
 * `create()`, this never generates new ids/timestamps/sortKey: it persists
 * `entry` as given (still schema-validated) so the entry reappears exactly
 * where it was, keeping any derived numbering stable.
 */
export async function restore(entry: DailyEntry): Promise<DailyEntry> {
  const db = getDatabase()
  const validated = parseEntry(entry)
  await db.entries.add(validated)
  return validated
}

export async function duplicate(id: string): Promise<DailyEntry> {
  const db = getDatabase()
  const existing = await db.entries.get(id)
  if (!existing) {
    throw new Error(`Entry not found: ${id}`)
  }
  const current = parseEntry(existing)
  const now = Date.now()

  const copy = parseEntry({
    ...current,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    // Same `time`, sortKey nudged just past the original so it sorts
    // immediately after it (byTimeThenSortKey) rather than before.
    sortKey: current.sortKey + 1,
  })

  await db.entries.add(copy)
  return copy
}
