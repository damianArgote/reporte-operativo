import { z } from 'zod'
import { isValidDateKey } from '@/utils/dates'
import { BACKGROUND_PALETTE_IDS } from './backgroundPaletteIds'
import { ENTRY_TYPE_IDS } from './entryTypeIds'

/**
 * Zod schemas for the domain entities (docs/specs/domain.md). These are the
 * single source of truth for both runtime validation at repository/import
 * boundaries (src/db/, M3 JSON import) and the corresponding TypeScript
 * types, inferred below via `z.infer` so the two can never drift apart.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const dateKeySchema = z
  .string()
  .refine(isValidDateKey, { message: 'Expected a valid YYYY-MM-DD calendar date' })

export const entryTypeIdSchema = z.enum(ENTRY_TYPE_IDS)

/**
 * Per-type structured fields (domain.md). All optional and all strings:
 * which ones are actually required for a given entry type is a concern of
 * the entry-type registry (src/domain/entryTypeRegistry.ts), not of this
 * shape-level schema.
 */
export const entryFieldsSchema = z
  .object({
    plate: z.string().optional(),
    vehicle: z.string().optional(),
    identifier: z.string().optional(),
    street: z.string().optional(),
    addressNumber: z.string().optional(),
    reason: z.string().optional(),
    observation: z.string().optional(),
  })
  .strict()

export const dailyEntrySchema = z.object({
  id: z.string().min(1),
  reportId: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
  time: z.string().regex(TIME_PATTERN, 'Expected HH:mm'),
  type: entryTypeIdSchema,
  towed: z.boolean(),
  denounced: z.boolean(),
  includeInReport: z.boolean(),
  sortKey: z.number(),
  fields: entryFieldsSchema,
  // `free`-type entries only; emitted verbatim, never parsed or reformatted.
  rawText: z.string().optional(),
  // Reserved, not used by M1.
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const dailyReportSchema = z.object({
  id: z.string().min(1),
  date: dateKeySchema,
  header: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const backgroundPaletteIdSchema = z.enum(BACKGROUND_PALETTE_IDS)

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  ticketedEmoji: z.string().min(1),
  // Added after the first settings rows were saved — `.default()` keeps
  // those old rows parsing (settings.repository.ts's `get()` boundary).
  background: backgroundPaletteIdSchema.default('neutral'),
})

export type EntryFields = z.infer<typeof entryFieldsSchema>
export type DailyEntry = z.infer<typeof dailyEntrySchema>
export type DailyReport = z.infer<typeof dailyReportSchema>
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  ticketedEmoji: '📱',
  background: 'neutral',
}
