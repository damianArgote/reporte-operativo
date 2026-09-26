import { useEffect } from 'react'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useReportStore } from '@/stores/reportStore'
import {
  findCustomBackground,
  isPresetBackgroundId,
  resolveCustomBackgroundApplication,
  type CustomBackgroundApplication,
} from './customBackgrounds'

/**
 * Background palette (T2, extended for custom backgrounds in T4):
 * Settings.background (IndexedDB, via reportStore/settingsRepository) is the
 * single source of truth. This applies it to the document — a preset via
 * `data-background` (matched by src/index.css), a custom background via
 * inline `--background`/`--foreground`/`--muted-foreground` (T4's automatic
 * readable text, see resolveCustomBackgroundApplication in
 * customBackgrounds.ts) — and mirrors it to localStorage so index.html's
 * inline anti-flash script can paint it before React/IndexedDB are ready.
 * The mirrors are never read back by the app itself — IndexedDB stays
 * authoritative.
 */
export const BACKGROUND_MIRROR_KEY = 'background-mirror'
/**
 * JSON `{ light: CustomBackgroundApplication, dark: CustomBackgroundApplication }`
 * for the currently selected custom background — absent for a preset. Both
 * theme variants are pre-resolved here (contrast math already applied) so
 * the anti-flash script only ever applies plain hex values, never repeats
 * the OKLCH/WCAG computation itself.
 */
export const CUSTOM_BACKGROUND_MIRROR_KEY = 'background-custom-mirror'

interface CustomBackgroundMirror {
  light: CustomBackgroundApplication
  dark: CustomBackgroundApplication
}

/** Sets `data-background` on <html> and mirrors the id to localStorage. */
export function applyBackgroundPalette(id: string): void {
  document.documentElement.setAttribute('data-background', id)
  try {
    localStorage.setItem(BACKGROUND_MIRROR_KEY, id)
  } catch {
    // Storage may be unavailable (private browsing/quota) — the mirror is
    // only a startup cache, so a failed write is safe to ignore.
  }
}

/** Clears any inline background/foreground overrides left by a previous custom selection. */
function clearCustomBackgroundStyles(): void {
  const style = document.documentElement.style
  style.removeProperty('--background')
  style.removeProperty('--foreground')
  style.removeProperty('--muted-foreground')
}

/** Applies a custom background's resolved hex to the document as inline CSS vars. */
function applyCustomBackgroundStyles(backgroundHex: string, theme: 'light' | 'dark'): void {
  const application = resolveCustomBackgroundApplication(backgroundHex, theme)
  const style = document.documentElement.style
  style.setProperty('--background', application.backgroundHex)
  if (application.foregroundHex) {
    style.setProperty('--foreground', application.foregroundHex)
  } else {
    style.removeProperty('--foreground')
  }
  if (application.mutedForegroundHex) {
    style.setProperty('--muted-foreground', application.mutedForegroundHex)
  } else {
    style.removeProperty('--muted-foreground')
  }
}

/** Applies `Settings.background` to the document as a side effect; returns the current id (preset or custom). */
export function useBackgroundPalette(): string {
  const background = useReportStore((state) => state.settings.background)
  const customBackgrounds = useReportStore((state) => state.settings.customBackgrounds)
  const resolvedTheme = useResolvedTheme()

  useEffect(() => {
    if (isPresetBackgroundId(background)) {
      applyBackgroundPalette(background)
      clearCustomBackgroundStyles()
      try {
        localStorage.removeItem(CUSTOM_BACKGROUND_MIRROR_KEY)
      } catch {
        // See applyBackgroundPalette above.
      }
      return
    }

    const custom = findCustomBackground(background, customBackgrounds)
    if (!custom) {
      // settingsSchema already falls a stale/unknown background id back to
      // 'neutral' at parse time — this is defense in depth, not the
      // expected path (e.g. a still-in-flight store update).
      applyBackgroundPalette('neutral')
      clearCustomBackgroundStyles()
      return
    }

    document.documentElement.setAttribute('data-background', background)
    const hex = resolvedTheme === 'dark' ? custom.dark : custom.light
    applyCustomBackgroundStyles(hex, resolvedTheme)
    try {
      localStorage.setItem(BACKGROUND_MIRROR_KEY, background)
      const mirror: CustomBackgroundMirror = {
        light: resolveCustomBackgroundApplication(custom.light, 'light'),
        dark: resolveCustomBackgroundApplication(custom.dark, 'dark'),
      }
      localStorage.setItem(CUSTOM_BACKGROUND_MIRROR_KEY, JSON.stringify(mirror))
    } catch {
      // See applyBackgroundPalette above.
    }
  }, [background, customBackgrounds, resolvedTheme])

  return background
}
