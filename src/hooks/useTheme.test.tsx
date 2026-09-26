import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReportStore } from '@/stores/reportStore'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { applyResolvedTheme, resolveTheme, THEME_MIRROR_KEY, useResolvedTheme } from './useTheme'

/**
 * A controllable stand-in for `window.matchMedia('(prefers-color-scheme: dark)')`:
 * jsdom has no real media-query engine, so tests drive it manually, including
 * firing the 'change' listener useResolvedTheme registers for the 'system' case.
 */
function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  let listeners: Array<(event: MediaQueryListEvent) => void> = []
  const mql = {
    get matches() {
      return matches
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    },
    removeEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners = listeners.filter((l) => l !== cb)
    },
  } as unknown as MediaQueryList
  window.matchMedia = vi.fn().mockReturnValue(mql)
  return {
    listenerCount: () => listeners.length,
    change(next: boolean) {
      matches = next
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent))
    },
  }
}

describe('resolveTheme', () => {
  it('returns the explicit theme for light/dark regardless of the OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('follows the OS preference for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('applyResolvedTheme', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('adds the "dark" class for the dark theme', () => {
    applyResolvedTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes the "dark" class for the light theme', () => {
    document.documentElement.classList.add('dark')
    applyResolvedTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('mirrors the resolved theme to localStorage for the anti-flash inline script', () => {
    applyResolvedTheme('dark')
    expect(localStorage.getItem(THEME_MIRROR_KEY)).toBe('dark')
  })
})

describe('useResolvedTheme', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    useReportStore.setState({ settings: DEFAULT_SETTINGS })
  })

  it('resolves and applies "dark" when Settings.theme is "dark"', () => {
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'dark' } })

    const { result } = renderHook(() => useResolvedTheme())

    expect(result.current).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('resolves and applies "light" when Settings.theme is "light"', () => {
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'light' } })

    const { result } = renderHook(() => useResolvedTheme())

    expect(result.current).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('resolves "system" via matchMedia and re-resolves live on a "change" event', () => {
    const media = mockMatchMedia(false)
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'system' } })

    const { result } = renderHook(() => useResolvedTheme())

    expect(result.current).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    act(() => {
      media.change(true)
    })

    expect(result.current).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('re-resolves when the persisted setting changes via the store', () => {
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'light' } })
    const { result } = renderHook(() => useResolvedTheme())
    expect(result.current).toBe('light')

    act(() => {
      useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'dark' } })
    })

    expect(result.current).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
