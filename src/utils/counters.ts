import { ENTRY_TYPE_ORDER, getEntryTypeConfig } from '@/domain/entryTypeRegistry'
import type { DailyEntry } from '@/types/schemas'
import type { EntryTypeId } from '@/types/entryTypeIds'

/**
 * Towed/per-type counters (domain.md invariants 2-3): only `towed === true`
 * entries are counted, regardless of `includeInReport`; per-type counters
 * are in registry order and always sum to the towed total.
 */

/** Total number of towed entries — the `N` in "Hoy N a playa:". */
export function computeTowedTotal(entries: DailyEntry[]): number {
  return entries.filter((entry) => entry.towed).length
}

export interface TypeCount {
  typeId: EntryTypeId
  countedLabel: string
  count: number
}

/** Per-type towed counts, in registry order, omitting types with a zero count. */
export function computeTypeCounts(entries: DailyEntry[]): TypeCount[] {
  const towedEntries = entries.filter((entry) => entry.towed)

  return ENTRY_TYPE_ORDER.map((typeId) => ({
    typeId,
    countedLabel: getEntryTypeConfig(typeId).countedLabel,
    count: towedEntries.filter((entry) => entry.type === typeId).length,
  })).filter((typeCount) => typeCount.count > 0)
}
