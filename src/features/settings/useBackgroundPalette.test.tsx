import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useReportStore } from '@/stores/reportStore'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { applyBackgroundPalette, BACKGROUND_MIRROR_KEY, useBackgroundPalette } from './useBackgroundPalette'

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
    useReportStore.setState({ settings: DEFAULT_SETTINGS })
  })

  it('applies Settings.background on mount', () => {
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, background: 'niebla' } })

    const { result } = renderHook(() => useBackgroundPalette())

    expect(result.current).toBe('niebla')
    expect(document.documentElement.getAttribute('data-background')).toBe('niebla')
  })

  it('re-applies when the persisted setting changes', () => {
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, background: 'neutral' } })
    renderHook(() => useBackgroundPalette())

    act(() => {
      useReportStore.setState((state) => ({ settings: { ...state.settings, background: 'lavanda' } }))
    })

    expect(document.documentElement.getAttribute('data-background')).toBe('lavanda')
  })
})
