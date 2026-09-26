import { describe, expect, it } from 'vitest'
import { BACKGROUND_PALETTE_IDS } from '@/types/backgroundPaletteIds'
import { BACKGROUND_PALETTES, getBackgroundPalette } from './backgroundPalette'

/**
 * oklch(L C H) -> linear sRGB, per the CSS Color 4 / Björn Ottosson OKLab
 * reference matrices — a tiny pure test-only helper, not shipped in
 * production code, used only to verify the palette's contrast below.
 */
function oklchToLinearSrgb(L: number, C: number, hueDeg: number): [number, number, number] {
  const hueRad = (hueDeg * Math.PI) / 180
  const a = C * Math.cos(hueRad)
  const b = C * Math.sin(hueRad)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return [r, g, bl]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const clamp = (x: number) => Math.min(Math.max(x, 0), 1)
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b)
}

/** WCAG 2.x contrast ratio between two relative luminances (order-independent). */
function contrastRatio(a: number, b: number): number {
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}

/** Parses a `oklch(L C H)` CSS string into its three numeric components. */
function parseOklch(value: string): [number, number, number] {
  const match = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(value)
  if (!match) throw new Error(`Not a plain oklch(L C H) string: ${value}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

// Fixed app foreground (index.css) — presets only ever override --background.
const LIGHT_FOREGROUND = relativeLuminance(oklchToLinearSrgb(0.145, 0, 0))
const DARK_FOREGROUND = relativeLuminance(oklchToLinearSrgb(0.985, 0, 0))

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
      const bgLuminance = relativeLuminance(oklchToLinearSrgb(...parseOklch(preset.light.background)))
      expect(contrastRatio(bgLuminance, LIGHT_FOREGROUND)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each(BACKGROUND_PALETTES)(
    'preset "$id": dark background keeps ≥4.5:1 contrast against the dark foreground',
    (preset) => {
      const bgLuminance = relativeLuminance(oklchToLinearSrgb(...parseOklch(preset.dark.background)))
      expect(contrastRatio(bgLuminance, DARK_FOREGROUND)).toBeGreaterThanOrEqual(4.5)
    },
  )
})
