import { BACKGROUND_PALETTE_IDS, type BackgroundPaletteId } from '@/types/backgroundPaletteIds'
import type { ResolvedTheme } from '@/hooks/useTheme'
import type { CustomBackground } from '@/types/schemas'
import {
  APP_FOREGROUND_HEX,
  oklchToHex,
  resolveReadableForeground,
  resolveReadableMutedForeground,
} from '@/utils/color'
import { getBackgroundPalette } from './backgroundPalette'

/**
 * User-created background colors (T4, docs/specs/domain.md Decision #18):
 * id/lookup helpers plus the pure apply resolution used by
 * useBackgroundPalette.ts and the anti-flash script's production logic —
 * kept side-effect-free so both can share and unit-test it directly.
 */

export const MAX_CUSTOM_BACKGROUNDS = 8

/** `custom-<uuid>` — distinguishes a user-created background id from a preset id. */
export function createCustomBackgroundId(): string {
  return `custom-${crypto.randomUUID()}`
}

export function isPresetBackgroundId(id: string): id is BackgroundPaletteId {
  return (BACKGROUND_PALETTE_IDS as readonly string[]).includes(id)
}

export function isCustomBackgroundId(id: string): boolean {
  return id.startsWith('custom-')
}

export function findCustomBackground(
  id: string,
  customBackgrounds: CustomBackground[],
): CustomBackground | undefined {
  return customBackgrounds.find((custom) => custom.id === id)
}

/** The hex value for `id` in the resolved theme — from a custom background only (presets stay CSS-driven). */
export function resolveCustomBackgroundHex(
  id: string,
  customBackgrounds: CustomBackground[],
  resolvedTheme: ResolvedTheme,
): string | null {
  const custom = findCustomBackground(id, customBackgrounds)
  if (!custom) return null
  return resolvedTheme === 'dark' ? custom.dark : custom.light
}

export interface CustomBackgroundApplication {
  /** The background hex to apply as `--background`. */
  backgroundHex: string
  /** `--foreground` override, or `null` to leave the theme default in place. */
  foregroundHex: string | null
  /** `--muted-foreground` override, or `null` to leave the theme default in place. */
  mutedForegroundHex: string | null
}

/**
 * Pure resolution of what a custom background selection should apply to the
 * document for `theme`: the background itself, plus foreground/
 * muted-foreground overrides only when the theme's own defaults don't read
 * well against it (docs/specs/domain.md Decision #18 — automatic readable
 * text). `null` overrides mean "clear any previous override, use the CSS
 * default" — the DOM-touching caller (useBackgroundPalette.ts) and the
 * anti-flash inline script (index.html) both apply this same shape.
 */
export function resolveCustomBackgroundApplication(
  backgroundHex: string,
  theme: ResolvedTheme,
): CustomBackgroundApplication {
  const defaultForeground = APP_FOREGROUND_HEX[theme]
  const foreground = resolveReadableForeground(backgroundHex, defaultForeground)

  if (!foreground.overridden) {
    return { backgroundHex, foregroundHex: null, mutedForegroundHex: null }
  }

  const muted = resolveReadableMutedForeground(backgroundHex, foreground.foreground)
  return { backgroundHex, foregroundHex: foreground.foreground, mutedForegroundHex: muted.color }
}

/**
 * The effective background hex for `background` (preset or custom id) under
 * `theme` — used to seed the "Crear color" editor's defaults from whatever
 * is currently applied. Presets are stored as `oklch(...)` (backgroundPalette.ts)
 * and converted to hex here since the editor works with native
 * `<input type="color">` values. Falls back to the neutral preset for an
 * unknown id (defense in depth — settingsSchema already resolves this at
 * parse time).
 */
export function resolveEffectiveBackgroundHex(
  background: string,
  customBackgrounds: CustomBackground[],
  theme: ResolvedTheme,
): string {
  if (isCustomBackgroundId(background)) {
    const custom = findCustomBackground(background, customBackgrounds)
    if (custom) return theme === 'dark' ? custom.dark : custom.light
  }
  const preset = getBackgroundPalette(isPresetBackgroundId(background) ? background : 'neutral')
  return oklchToHex(theme === 'dark' ? preset.dark.background : preset.light.background)
}
