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
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
// Matches createCustomBackgroundId() (src/features/settings/customBackgrounds.ts):
// `custom-` + crypto.randomUUID().
const CUSTOM_BACKGROUND_ID_PATTERN =
  /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const MAX_CUSTOM_BACKGROUNDS = 8

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

/**
 * A user-created background color (T4, docs/specs/domain.md Decision #18):
 * one light + one dark hex value, background only (no accent). `id` is
 * `custom-<uuid>`, produced by createCustomBackgroundId()
 * (src/features/settings/customBackgrounds.ts) via crypto.randomUUID().
 * Hex values are lowercase-normalized on parse.
 */
export const customBackgroundSchema = z.object({
  id: z.string().regex(CUSTOM_BACKGROUND_ID_PATTERN, 'Expected a "custom-<uuid>" id'),
  light: z
    .string()
    .regex(HEX_COLOR_PATTERN, 'Expected a #rrggbb hex color')
    .transform((value) => value.toLowerCase()),
  dark: z
    .string()
    .regex(HEX_COLOR_PATTERN, 'Expected a #rrggbb hex color')
    .transform((value) => value.toLowerCase()),
})

const settingsShape = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  ticketedEmoji: z.string().min(1),
  // Added after the first settings rows were saved — `.default()` keeps
  // those old rows parsing (settings.repository.ts's `get()` boundary).
  // Loosened from an enum of preset ids (T2) to a plain string (T4): it now
  // also accepts a custom background's id. The `settingsSchema` transform
  // below falls a stale/unknown value back to 'neutral' at parse time.
  background: z.string().min(1).default('neutral'),
  // App-only: shown in-app (Today header greeting), never in the
  // generated report — see docs/specs/domain.md Decisions #17.
  userName: z.string().trim().max(40).default(''),
  // User-created background colors (T4) — background only, max 8.
  customBackgrounds: z.array(customBackgroundSchema).max(MAX_CUSTOM_BACKGROUNDS).default([]),
})

export const settingsSchema = settingsShape.transform((settings) => {
  const isPreset = (BACKGROUND_PALETTE_IDS as readonly string[]).includes(settings.background)
  const isKnownCustom = settings.customBackgrounds.some((custom) => custom.id === settings.background)
  if (isPreset || isKnownCustom) return settings
  // Stale/unknown selection — an old row from before a preset existed, or a
  // custom background that has since been deleted — falls back to 'neutral'
  // at read time rather than failing to parse.
  return { ...settings, background: 'neutral' }
})

export type EntryFields = z.infer<typeof entryFieldsSchema>
export type DailyEntry = z.infer<typeof dailyEntrySchema>
export type DailyReport = z.infer<typeof dailyReportSchema>
export type CustomBackground = z.infer<typeof customBackgroundSchema>
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  ticketedEmoji: '📱',
  background: 'neutral',
  userName: '',
  customBackgrounds: [],
}
