import { describe, expect, it } from 'vitest'
import { BACKGROUND_PALETTE_IDS } from '@/types/backgroundPaletteIds'
import { contrastRatio, oklchLuminance } from '@/utils/color'
import { BACKGROUND_PALETTES, getBackgroundPalette } from './backgroundPalette'

// Fixed app foreground (index.css) — presets only ever override --background.
const LIGHT_FOREGROUND = oklchLuminance('oklch(0.145 0 0)')
const DARK_FOREGROUND = oklchLuminance('oklch(0.985 0 0)')

describe('BACKGROUND_PALETTES', () => {
  it('has exactly the registry ids, in order', () => {
    expect(BACKGROUND_PALETTES.map((preset) => preset.id)).toEqual([...BACKGROUND_PALETTE_IDS])
  })

  it('gives every preset a Spanish label and a light + dark background', () => {
    for (const preset of BACKGROUND_PALETTES) {
      expect(preset.label.length).toBeGreaterThan(0)
      expect(preset.light.background).toMatch(/^oklch\(/)
      expect(preset.dark.background).toMatch(/^oklch\(/)
    }
  })

  it('getBackgroundPalette looks a preset up by id, falling back to the first preset', () => {
    expect(getBackgroundPalette('arena').id).toBe('arena')
    // @ts-expect-error - exercising the fallback for a value outside the union
    expect(getBackgroundPalette('bogus').id).toBe(BACKGROUND_PALETTES[0]?.id)
  })

  it.each(BACKGROUND_PALETTES)(
    'preset "$id": light background keeps ≥4.5:1 contrast against the light foreground',
    (preset) => {
      expect(contrastRatio(oklchLuminance(preset.light.background), LIGHT_FOREGROUND)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each(BACKGROUND_PALETTES)(
    'preset "$id": dark background keeps ≥4.5:1 contrast against the dark foreground',
    (preset) => {
      expect(contrastRatio(oklchLuminance(preset.dark.background), DARK_FOREGROUND)).toBeGreaterThanOrEqual(4.5)
    },
  )
})
