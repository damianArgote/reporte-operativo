/**
 * Background palette preset ids (docs/specs/domain.md Settings table).
 * Kept as its own tiny module — same pattern as entryTypeIds.ts — so
 * schemas.ts can build a Zod enum from it without importing the full
 * preset registry (src/features/settings/backgroundPalette.ts, which also
 * carries the actual oklch values and never needs to be imported here).
 */
export const BACKGROUND_PALETTE_IDS = [
  'neutral',
  'arena',
  'salvia',
  'niebla',
  'lavanda',
  'piedra',
] as const

export type BackgroundPaletteId = (typeof BACKGROUND_PALETTE_IDS)[number]
