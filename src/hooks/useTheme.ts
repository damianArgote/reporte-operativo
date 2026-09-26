import { useEffect, useSyncExternalStore } from 'react'
import { useReportStore } from '@/stores/reportStore'
import type { Settings } from '@/types/schemas'

/**
 * Dark mode (T6a): Settings.theme (IndexedDB, via reportStore/settingsRepository)
 * is the single source of truth. This module resolves it to `light | dark` and
 * applies it to the document via shadcn's `dark`-class convention.
 *
 * `THEME_MIRROR_KEY` is a plain localStorage cache of the *resolved* theme,
 * written every time it changes, so index.html's inline anti-flash script can
 * paint the right class before React/IndexedDB are ready. It is never read
 * back by the app itself — IndexedDB stays authoritative.
 */
export const THEME_MIRROR_KEY = 'theme-mirror'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export type ResolvedTheme = 'light' | 'dark'

/** Pure: resolves the persisted setting to `light | dark` given the current OS preference. */
export function resolveTheme(theme: Settings['theme'], systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light'
  return theme
}

/** Toggles the `dark` class on `<html>` and mirrors the result to localStorage. */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  try {
    localStorage.setItem(THEME_MIRROR_KEY, resolved)
  } catch {
    // Storage may be unavailable (private browsing/quota) — the mirror is only
    // a startup cache, so a failed write is safe to ignore.
  }
}

function getSystemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_MEDIA_QUERY).matches
    : false
}

function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mql = window.matchMedia(DARK_MEDIA_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * Resolves `Settings.theme` to `light | dark` (tracking OS changes live for
 * "system") and applies it to the document as a side effect. Safe to call
 * from multiple components (the app root, the Toaster) — applying is
 * idempotent.
 */
export function useResolvedTheme(): ResolvedTheme {
  const theme = useReportStore((state) => state.settings.theme)
  const systemPrefersDark = useSyncExternalStore(subscribeToSystemTheme, getSystemPrefersDark)
  const resolved = resolveTheme(theme, systemPrefersDark)

  useEffect(() => {
    applyResolvedTheme(resolved)
  }, [resolved])

  return resolved
}
