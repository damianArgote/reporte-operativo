import { describe, expect, it } from 'vitest'
import {
  APP_FOREGROUND_HEX,
  APP_MUTED_FOREGROUND_HEX,
  contrastRatio,
  hexContrastRatio,
  hexLuminance,
  oklchLuminance,
  oklchToLinearSrgb,
  parseOklch,
  relativeLuminance,
  resolveReadableForeground,
  resolveReadableMutedForeground,
} from './color'

describe('oklchToLinearSrgb / relativeLuminance', () => {
  it('resolves oklch(1 0 0) (white) to ~1 linear luminance', () => {
    expect(relativeLuminance(oklchToLinearSrgb(1, 0, 0))).toBeCloseTo(1, 2)
  })

  it('resolves oklch(0 0 0) (black) to ~0 linear luminance', () => {
    expect(relativeLuminance(oklchToLinearSrgb(0, 0, 0))).toBeCloseTo(0, 2)
  })
})

describe('parseOklch', () => {
  it('parses an oklch(L C H) CSS string', () => {
    expect(parseOklch('oklch(0.96 0.015 75)')).toEqual([0.96, 0.015, 75])
  })

  it('throws on a non-oklch string', () => {
    expect(() => parseOklch('#ffffff')).toThrow()
  })
})

describe('contrastRatio', () => {
  it('is 21:1 between pure black and pure white', () => {
    expect(contrastRatio(0, 1)).toBeCloseTo(21, 0)
  })

  it('is order-independent', () => {
    expect(contrastRatio(0.2, 0.8)).toBeCloseTo(contrastRatio(0.8, 0.2), 10)
  })

  it('is 1:1 for identical luminances', () => {
    expect(contrastRatio(0.5, 0.5)).toBeCloseTo(1, 5)
  })
})

describe('oklchLuminance', () => {
  it('matches relativeLuminance(oklchToLinearSrgb(...parseOklch(value)))', () => {
    expect(oklchLuminance('oklch(0.5 0.1 200)')).toBeCloseTo(
      relativeLuminance(oklchToLinearSrgb(0.5, 0.1, 200)),
      10,
    )
  })
})

describe('hexLuminance / hexContrastRatio', () => {
  it('resolves #ffffff to ~1 and #000000 to ~0', () => {
    expect(hexLuminance('#ffffff')).toBeCloseTo(1, 2)
    expect(hexLuminance('#000000')).toBeCloseTo(0, 2)
  })

  it('is ~21:1 between #000000 and #ffffff', () => {
    expect(hexContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('is symmetric regardless of argument order', () => {
    expect(hexContrastRatio('#222222', '#fafafa')).toBeCloseTo(hexContrastRatio('#fafafa', '#222222'), 10)
  })
})

describe('APP_FOREGROUND_HEX / APP_MUTED_FOREGROUND_HEX', () => {
  it('gives a near-black light foreground and a near-white dark foreground', () => {
    expect(hexLuminance(APP_FOREGROUND_HEX.light)).toBeLessThan(0.05)
    expect(hexLuminance(APP_FOREGROUND_HEX.dark)).toBeGreaterThan(0.9)
  })

  it('gives muted-foreground tones between background and foreground extremes', () => {
    expect(hexLuminance(APP_MUTED_FOREGROUND_HEX.light)).toBeGreaterThan(hexLuminance(APP_FOREGROUND_HEX.light))
    expect(hexLuminance(APP_MUTED_FOREGROUND_HEX.dark)).toBeLessThan(hexLuminance(APP_FOREGROUND_HEX.dark))
  })
})

describe('resolveReadableForeground', () => {
  it('keeps the default foreground when it already reads well (>=4.5:1) — near-white bg, light-theme default', () => {
    const result = resolveReadableForeground('#fafafa', APP_FOREGROUND_HEX.light)
    expect(result.overridden).toBe(false)
    expect(result.foreground).toBe(APP_FOREGROUND_HEX.light)
    expect(result.contrast).toBeGreaterThanOrEqual(4.5)
  })

  it('overrides to a near-white foreground for a dark custom bg under the light-theme default (dark-on-dark)', () => {
    const result = resolveReadableForeground('#222222', APP_FOREGROUND_HEX.light)
    expect(result.overridden).toBe(true)
    expect(hexLuminance(result.foreground)).toBeGreaterThan(0.5)
    expect(result.contrast).toBeGreaterThanOrEqual(4.5)
  })

  it('picks whichever of near-black/near-white contrasts best, for a light custom bg under the dark-theme default (light-on-light)', () => {
    const result = resolveReadableForeground('#eeeeee', APP_FOREGROUND_HEX.dark)
    expect(result.overridden).toBe(true)
    expect(hexLuminance(result.foreground)).toBeLessThan(0.5)
  })
})

describe('resolveReadableMutedForeground', () => {
  it('finds a mid tone between bg and fg that still clears 4.5:1 for a typical high-contrast pair', () => {
    const result = resolveReadableMutedForeground('#ffffff', APP_FOREGROUND_HEX.light)
    expect(result.meetsTarget).toBe(true)
    expect(result.contrast).toBeGreaterThanOrEqual(4.5)
    // "muted" = less contrast than the full foreground, i.e. closer to bg.
    expect(result.contrast).toBeLessThan(hexContrastRatio('#ffffff', APP_FOREGROUND_HEX.light))
  })

  it('falls back to >=3:1 and reports when 4.5:1 is not reachable in the bg/fg range', () => {
    // A pathological pair with a very narrow luminance range between fg and bg.
    const result = resolveReadableMutedForeground('#808080', '#8c8c8c')
    expect(result.meetsTarget).toBe(false)
    if (result.meetsFallback) {
      expect(result.contrast).toBeGreaterThanOrEqual(3)
    }
  })
})
