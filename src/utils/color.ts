/**
 * Pure color math: OKLCH -> linear sRGB -> relative luminance -> WCAG
 * contrast, plus hex parsing/formatting and the readable-text resolution
 * used by custom background colors (T4, docs/specs/domain.md Decision #18).
 *
 * The OKLCH/luminance/contrast core was originally written as a test-only
 * helper in backgroundPalette.test.ts (T2); it moved here so production code
 * (resolveReadableForeground/resolveReadableMutedForeground below) and tests
 * share one implementation instead of duplicating the math.
 */

export type RgbTriple = [number, number, number]

const HEX_PATTERN = /^#([0-9a-fA-F]{6})$/

/** oklch(L C H) -> linear sRGB, per the CSS Color 4 / Björn Ottosson OKLab reference matrices. */
export function oklchToLinearSrgb(L: number, C: number, hueDeg: number): RgbTriple {
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

/** WCAG relative luminance from *linear* sRGB channels (0..1, clamped). */
export function relativeLuminance([r, g, b]: RgbTriple): number {
  const clamp = (x: number) => Math.min(Math.max(x, 0), 1)
  return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b)
}

/** WCAG 2.x contrast ratio between two relative luminances (order-independent). */
export function contrastRatio(a: number, b: number): number {
  const [lighter, darker] = a > b ? [a, b] : [b, a]
  return (lighter + 0.05) / (darker + 0.05)
}

/** Parses an `oklch(L C H)` CSS string into its three numeric components. */
export function parseOklch(value: string): [number, number, number] {
  const match = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(value)
  if (!match) throw new Error(`Not a plain oklch(L C H) string: ${value}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** Relative luminance of an `oklch(L C H)` CSS string. */
export function oklchLuminance(value: string): number {
  return relativeLuminance(oklchToLinearSrgb(...parseOklch(value)))
}

function srgbChannelToLinear(c255: number): number {
  const c = c255 / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function linearToSrgbChannel(c: number): number {
  const clamped = Math.min(Math.max(c, 0), 1)
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055
}

/** Parses a `#rrggbb` hex string (case-insensitive) into 0..255 channels. */
export function hexToRgb255(hex: string): RgbTriple {
  const match = HEX_PATTERN.exec(hex)
  if (!match) throw new Error(`Not a #rrggbb hex color: ${hex}`)
  const value = match[1]!
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

function rgb255ToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)))
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`
}

/** Relative luminance of a `#rrggbb` hex string. */
export function hexLuminance(hex: string): number {
  const [r, g, b] = hexToRgb255(hex)
  return relativeLuminance([srgbChannelToLinear(r), srgbChannelToLinear(g), srgbChannelToLinear(b)])
}

/** WCAG contrast ratio between two `#rrggbb` colors. */
export function hexContrastRatio(a: string, b: string): number {
  return contrastRatio(hexLuminance(a), hexLuminance(b))
}

/** Converts an `oklch(L C H)` CSS string to a lowercase `#rrggbb` hex string. */
export function oklchToHex(value: string): string {
  const [r, g, b] = oklchToLinearSrgb(...parseOklch(value))
  const to255 = (c: number) => linearToSrgbChannel(c) * 255
  return rgb255ToHex(to255(r), to255(g), to255(b))
}

const MIN_READABLE_CONTRAST = 4.5

/**
 * The app's actual `--foreground` tokens (src/index.css `:root`/`.dark`),
 * pre-converted to hex. These double as the "near-black" (light theme) and
 * "near-white" (dark theme) override candidates for
 * `resolveReadableForeground` below — the app's own foreground colors
 * already sit at those extremes, so there is no separate hardcoded pair to
 * keep in sync.
 */
export const APP_FOREGROUND_HEX: Record<'light' | 'dark', string> = {
  light: oklchToHex('oklch(0.145 0 0)'),
  dark: oklchToHex('oklch(0.985 0 0)'),
}

/** The app's actual `--muted-foreground` tokens (src/index.css), pre-converted to hex. */
export const APP_MUTED_FOREGROUND_HEX: Record<'light' | 'dark', string> = {
  light: oklchToHex('oklch(0.556 0 0)'),
  dark: oklchToHex('oklch(0.708 0 0)'),
}

export interface ReadableForegroundResult {
  /** The foreground hex to use: `defaultFgHex` unchanged, or an override. */
  foreground: string
  /** True when `foreground` differs from `defaultFgHex`. */
  overridden: boolean
  /** WCAG contrast of `foreground` against `bgHex`. */
  contrast: number
}

/**
 * Resolves a readable foreground color for a custom background.
 *
 * If the theme's own default foreground already reads well against `bgHex`
 * (>=4.5:1), it is kept unchanged. Otherwise the override is whichever of
 * the app's near-black (`APP_FOREGROUND_HEX.light`) or near-white
 * (`APP_FOREGROUND_HEX.dark`) tokens contrasts better against `bgHex`.
 */
export function resolveReadableForeground(bgHex: string, defaultFgHex: string): ReadableForegroundResult {
  const defaultContrast = hexContrastRatio(bgHex, defaultFgHex)
  if (defaultContrast >= MIN_READABLE_CONTRAST) {
    return { foreground: defaultFgHex, overridden: false, contrast: defaultContrast }
  }

  const blackContrast = hexContrastRatio(bgHex, APP_FOREGROUND_HEX.light)
  const whiteContrast = hexContrastRatio(bgHex, APP_FOREGROUND_HEX.dark)

  return blackContrast >= whiteContrast
    ? { foreground: APP_FOREGROUND_HEX.light, overridden: true, contrast: blackContrast }
    : { foreground: APP_FOREGROUND_HEX.dark, overridden: true, contrast: whiteContrast }
}

export interface MutedForegroundResult {
  /** The muted-foreground hex to use. */
  color: string
  /** WCAG contrast of `color` against the background. */
  contrast: number
  /** Whether `color` clears the primary 4.5:1 target. */
  meetsTarget: boolean
  /** Whether `color` clears the relaxed 3:1 fallback (implied by `meetsTarget`). */
  meetsFallback: boolean
}

const MUTED_TARGET_CONTRAST = 4.5
const MUTED_FALLBACK_CONTRAST = 3

/**
 * Resolves a "muted" (subtler than the main foreground, but still legible)
 * gray tone against `bgHex`, searching the 256 gray levels between the
 * background's and the foreground's own luminance. Picks the tone closest to
 * the background (most muted) that still clears 4.5:1; relaxes to 3:1 if
 * 4.5:1 isn't reachable in that range; otherwise falls back to the
 * foreground color itself (the best contrast achievable) and reports the
 * shortfall via `meetsTarget`/`meetsFallback`.
 */
export function resolveReadableMutedForeground(bgHex: string, foregroundHex: string): MutedForegroundResult {
  const bgLuminance = hexLuminance(bgHex)
  const fgLuminance = hexLuminance(foregroundHex)
  const lo = Math.min(bgLuminance, fgLuminance)
  const hi = Math.max(bgLuminance, fgLuminance)

  const candidates: { hex: string; contrast: number }[] = []
  for (let level = 0; level <= 255; level++) {
    const hex = rgb255ToHex(level, level, level)
    const luminance = hexLuminance(hex)
    if (luminance < lo || luminance > hi) continue
    candidates.push({ hex, contrast: contrastRatio(luminance, bgLuminance) })
  }

  const pickMostMuted = (list: typeof candidates) =>
    list.reduce((best, candidate) => (candidate.contrast < best.contrast ? candidate : best))

  const meetingTarget = candidates.filter((c) => c.contrast >= MUTED_TARGET_CONTRAST)
  if (meetingTarget.length > 0) {
    const picked = pickMostMuted(meetingTarget)
    return { color: picked.hex, contrast: picked.contrast, meetsTarget: true, meetsFallback: true }
  }

  const meetingFallback = candidates.filter((c) => c.contrast >= MUTED_FALLBACK_CONTRAST)
  if (meetingFallback.length > 0) {
    const picked = pickMostMuted(meetingFallback)
    return { color: picked.hex, contrast: picked.contrast, meetsTarget: false, meetsFallback: true }
  }

  const fallbackContrast = hexContrastRatio(bgHex, foregroundHex)
  return {
    color: foregroundHex,
    contrast: fallbackContrast,
    meetsTarget: fallbackContrast >= MUTED_TARGET_CONTRAST,
    meetsFallback: fallbackContrast >= MUTED_FALLBACK_CONTRAST,
  }
}
