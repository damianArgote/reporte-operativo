import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReportStore } from '@/stores/reportStore'
import { DEFAULT_SETTINGS, type CustomBackground } from '@/types/schemas'
import {
  applyBackgroundPalette,
  BACKGROUND_MIRROR_KEY,
  CUSTOM_BACKGROUND_MIRROR_KEY,
  useBackgroundPalette,
} from './useBackgroundPalette'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as MediaQueryList)
}

function resetDocumentStyles() {
  const style = document.documentElement.style
  style.removeProperty('--background')
  style.removeProperty('--foreground')
  style.removeProperty('--muted-foreground')
}

const CUSTOM: CustomBackground = {
  id: 'custom-11111111-1111-4111-8111-111111111111',
  light: '#fafafa',
  dark: '#222222',
}

describe('applyBackgroundPalette', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-background')
    localStorage.clear()
  })

  it('sets data-background on <html>', () => {
    applyBackgroundPalette('arena')
    expect(document.documentElement.getAttribute('data-background')).toBe('arena')
  })

  it('mirrors the id to localStorage for the anti-flash inline script', () => {
    applyBackgroundPalette('salvia')
    expect(localStorage.getItem(BACKGROUND_MIRROR_KEY)).toBe('salvia')
  })
})

describe('useBackgroundPalette', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-background')
    localStorage.clear()
    resetDocumentStyles()
    mockMatchMedia(false)
    useReportStore.setState({ settings: DEFAULT_SETTINGS })
  })

  it('applies Settings.background on mount', () => {
    mockMatchMedia(false)
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, background: 'niebla' } })

    const { result } = renderHook(() => useBackgroundPalette())

    expect(result.current).toBe('niebla')
    expect(document.documentElement.getAttribute('data-background')).toBe('niebla')
  })

  it('re-applies when the persisted setting changes', () => {
    mockMatchMedia(false)
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, background: 'neutral' } })
    renderHook(() => useBackgroundPalette())

    act(() => {
      useReportStore.setState((state) => ({ settings: { ...state.settings, background: 'lavanda' } }))
    })

    expect(document.documentElement.getAttribute('data-background')).toBe('lavanda')
  })

  describe('custom backgrounds', () => {
    it('sets --background inline for a selected custom background (light theme)', () => {
      mockMatchMedia(false)
      useReportStore.setState({
        settings: { ...DEFAULT_SETTINGS, background: CUSTOM.id, customBackgrounds: [CUSTOM] },
      })

      renderHook(() => useBackgroundPalette())

      expect(document.documentElement.style.getPropertyValue('--background')).toBe(CUSTOM.light)
    })

    it('resolves the dark variant when the resolved theme is dark', () => {
      mockMatchMedia(true) // system prefers dark
      useReportStore.setState({
        settings: { ...DEFAULT_SETTINGS, theme: 'system', background: CUSTOM.id, customBackgrounds: [CUSTOM] },
      })

      renderHook(() => useBackgroundPalette())

      expect(document.documentElement.style.getPropertyValue('--background')).toBe(CUSTOM.dark)
    })

    it('re-applies the matching variant live when the resolved theme changes', () => {
      mockMatchMedia(false)
      useReportStore.setState({
        settings: { ...DEFAULT_SETTINGS, theme: 'light', background: CUSTOM.id, customBackgrounds: [CUSTOM] },
      })
      renderHook(() => useBackgroundPalette())
      expect(document.documentElement.style.getPropertyValue('--background')).toBe(CUSTOM.light)

      act(() => {
        useReportStore.setState((state) => ({ settings: { ...state.settings, theme: 'dark' } }))
      })

      expect(document.documentElement.style.getPropertyValue('--background')).toBe(CUSTOM.dark)
    })

    it('overrides --foreground/--muted-foreground when the custom bg does not read well, and clears them for a readable one', () => {
      mockMatchMedia(false)
      useReportStore.setState({
        settings: { ...DEFAULT_SETTINGS, background: CUSTOM.id, customBackgrounds: [CUSTOM] },
      })
      const { rerender } = renderHook(() => useBackgroundPalette())
      // CUSTOM.light (#fafafa) reads well against the light-theme default foreground.
      expect(document.documentElement.style.getPropertyValue('--foreground')).toBe('')

      const dark = { ...CUSTOM, light: '#222222' }
      act(() => {
        useReportStore.setState((state) => ({
          settings: { ...state.settings, customBackgrounds: [dark] },
        }))
      })
      rerender()

      expect(document.documentElement.style.getPropertyValue('--foreground')).not.toBe('')
      expect(document.documentElement.style.getPropertyValue('--muted-foreground')).not.toBe('')
    })

    it('clears inline vars when switching from a custom background back to a preset', () => {
      mockMatchMedia(false)
      useReportStore.setState({
        settings: { ...DEFAULT_SETTINGS, background: CUSTOM.id, customBackgrounds: [CUSTOM] },
      })
      renderHook(() => useBackgroundPalette())
      expect(document.documentElement.style.getPropertyValue('--background')).toBe(CUSTOM.light)

      act(() => {
        useReportStore.setState((state) => ({ settings: { ...state.settings, background: 'arena' } }))
      })

      expect(document.documentElement.style.getPropertyValue('--background')).toBe('')
      expect(document.documentElement.getAttribute('data-background')).toBe('arena')
    })

    it('mirrors the resolved light+dark application to localStorage for the anti-flash script, and clears it for a preset', () => {
      mockMatchMedia(false)
      useReportStore.setState({
        settings: { ...DEFAULT_SETTINGS, background: CUSTOM.id, customBackgrounds: [CUSTOM] },
      })
      const { rerender } = renderHook(() => useBackgroundPalette())

      const mirrored = JSON.parse(localStorage.getItem(CUSTOM_BACKGROUND_MIRROR_KEY)!)
      expect(mirrored.light.backgroundHex).toBe(CUSTOM.light)
      expect(mirrored.dark.backgroundHex).toBe(CUSTOM.dark)

      act(() => {
        useReportStore.setState((state) => ({ settings: { ...state.settings, background: 'arena' } }))
      })
      rerender()

      expect(localStorage.getItem(CUSTOM_BACKGROUND_MIRROR_KEY)).toBeNull()
    })
  })
})
