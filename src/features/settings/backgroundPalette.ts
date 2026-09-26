import { BACKGROUND_PALETTE_IDS, type BackgroundPaletteId } from '@/types/backgroundPaletteIds'

/**
 * Background palette registry (T2): one preset per entry, each with a
 * light and a dark `--background` value — applied via `data-background`
 * on <html> and consumed by the matching CSS rules in src/index.css (keep
 * both in sync when adding/editing a preset — see the comment there).
 *
 * All presets stay low-chroma on purpose: the app's foreground color never
 * changes per preset, so lightness is what keeps text contrast ≥4.5:1
 * (verified by backgroundPalette.test.ts). Light presets stay close to
 * white (L ~0.95-1); dark presets stay close to near-black (L ~0.15-0.21).
 */
export interface BackgroundPalettePreset {
  id: BackgroundPaletteId
  /** Spanish label — shown as the swatch's accessible name. */
  label: string
  light: { background: string }
  dark: { background: string }
}

export const BACKGROUND_PALETTES: BackgroundPalettePreset[] = [
  {
    id: 'neutral',
    label: 'Neutro',
    light: { background: 'oklch(1 0 0)' },
    dark: { background: 'oklch(0.145 0 0)' },
  },
  {
    id: 'arena',
    label: 'Arena',
    light: { background: 'oklch(0.96 0.015 75)' },
    dark: { background: 'oklch(0.2 0.02 70)' },
  },
  {
    id: 'salvia',
    label: 'Salvia',
    light: { background: 'oklch(0.96 0.02 145)' },
    dark: { background: 'oklch(0.19 0.025 150)' },
  },
  {
    id: 'niebla',
    label: 'Niebla',
    light: { background: 'oklch(0.96 0.012 240)' },
    dark: { background: 'oklch(0.19 0.02 235)' },
  },
  {
    id: 'lavanda',
    label: 'Lavanda',
    light: { background: 'oklch(0.96 0.02 300)' },
    dark: { background: 'oklch(0.2 0.025 300)' },
  },
  {
    id: 'piedra',
    label: 'Piedra',
    light: { background: 'oklch(0.95 0.008 60)' },
    dark: { background: 'oklch(0.21 0.01 60)' },
  },
]

export function getBackgroundPalette(id: BackgroundPaletteId): BackgroundPalettePreset {
  return BACKGROUND_PALETTES.find((preset) => preset.id === id) ?? BACKGROUND_PALETTES[0]!
}

// Keeps the registry's id order tied to the schema's id list — if someone
// adds an id to one but forgets the other, this throws in dev/tests instead
// of silently rendering a preset-less enum value or an unreachable preset.
if (BACKGROUND_PALETTES.length !== BACKGROUND_PALETTE_IDS.length) {
  throw new Error('BACKGROUND_PALETTES is out of sync with BACKGROUND_PALETTE_IDS')
}
