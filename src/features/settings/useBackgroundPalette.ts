import { useEffect } from 'react'
import { useReportStore } from '@/stores/reportStore'
import type { BackgroundPaletteId } from '@/types/backgroundPaletteIds'

/**
 * Background palette (T2): Settings.background (IndexedDB, via reportStore/
 * settingsRepository) is the single source of truth. This applies it to the
 * document as `data-background`, matched by the CSS rules in src/index.css.
 *
 * `BACKGROUND_MIRROR_KEY` mirrors the *current* id to localStorage, same
 * idea as useTheme.ts's THEME_MIRROR_KEY, so index.html's inline anti-flash
 * script can paint the right background before React/IndexedDB are ready.
 * Never read back by the app itself — IndexedDB stays authoritative.
 */
export const BACKGROUND_MIRROR_KEY = 'background-mirror'

/** Sets `data-background` on <html> and mirrors it to localStorage. */
export function applyBackgroundPalette(id: BackgroundPaletteId): void {
  document.documentElement.setAttribute('data-background', id)
  try {
    localStorage.setItem(BACKGROUND_MIRROR_KEY, id)
  } catch {
    // Storage may be unavailable (private browsing/quota) — the mirror is
    // only a startup cache, so a failed write is safe to ignore.
  }
}

/** Applies `Settings.background` to the document as a side effect; returns the current id. */
export function useBackgroundPalette(): BackgroundPaletteId {
  const background = useReportStore((state) => state.settings.background)

  useEffect(() => {
    applyBackgroundPalette(background)
  }, [background])

  return background
}
