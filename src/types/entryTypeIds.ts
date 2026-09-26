/**
 * Entry-type ids, in registry order. This is the single list that drives:
 * - the `type` field's allowed values (see schemas.ts),
 * - the entry-type registry's iteration order (see domain/entryTypeRegistry.ts),
 * - the summary block's per-type counter order (see utils/counters.ts).
 *
 * Adding a new entry type means adding one id here and one registry entry —
 * nothing else should need to change.
 */
export const ENTRY_TYPE_IDS = ['lp', 'mi', 'construction', 'ticketed', 'free'] as const

export type EntryTypeId = (typeof ENTRY_TYPE_IDS)[number]
