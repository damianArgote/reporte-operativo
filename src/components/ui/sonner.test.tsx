import { act, render } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReportStore } from '@/stores/reportStore'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { Toaster } from './sonner'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as MediaQueryList)
}

describe('Toaster', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    useReportStore.setState({ settings: DEFAULT_SETTINGS })
  })

  it('receives the resolved "dark" theme from Settings, not from next-themes', async () => {
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'dark' } })

    render(<Toaster />)
    // sonner's container only mounts once at least one toast exists, and its
    // subscriber notification runs on a later microtask/frame.
    await act(async () => {
      toast('hola')
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    const toaster = document.querySelector('[data-sonner-toaster]')
    expect(toaster).not.toBeNull()
    expect(toaster).toHaveAttribute('data-sonner-theme', 'dark')
  })

  it('receives the resolved "light" theme from Settings', async () => {
    useReportStore.setState({ settings: { ...DEFAULT_SETTINGS, theme: 'light' } })

    render(<Toaster />)
    await act(async () => {
      toast('hola')
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    const toaster = document.querySelector('[data-sonner-toaster]')
    expect(toaster).toHaveAttribute('data-sonner-theme', 'light')
  })
})
