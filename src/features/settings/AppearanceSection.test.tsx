import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReportStore } from '@/stores/reportStore'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { AppearanceSection } from './AppearanceSection'
import { BACKGROUND_PALETTES } from './backgroundPalette'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as MediaQueryList)
}

describe('AppearanceSection', () => {
  beforeEach(() => {
    mockMatchMedia(false)
    useReportStore.setState({
      settings: DEFAULT_SETTINGS,
      updateSettings: vi.fn(async (patch) => {
        useReportStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
      }),
    })
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.removeAttribute('data-background')
  })

  describe('theme', () => {
    it('renders a "Claro / Oscuro / Sistema" radio group', () => {
      render(<AppearanceSection />)
      expect(screen.getByRole('radio', { name: 'Claro' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Sistema' })).toBeInTheDocument()
    })

    it('selecting "Oscuro" persists it via reportStore.updateSettings and toggles the dark class', async () => {
      const user = userEvent.setup()
      render(<AppearanceSection />)

      await user.click(screen.getByRole('radio', { name: 'Oscuro' }))

      expect(useReportStore.getState().settings.theme).toBe('dark')
    })

    it('selecting "Sistema" persists it', async () => {
      useReportStore.setState((state) => ({ settings: { ...state.settings, theme: 'dark' } }))
      const user = userEvent.setup()
      render(<AppearanceSection />)

      await user.click(screen.getByRole('radio', { name: 'Sistema' }))

      expect(useReportStore.getState().settings.theme).toBe('system')
    })
  })

  describe('background palette', () => {
    it('renders one swatch per preset, each with its Spanish name as accessible name', () => {
      render(<AppearanceSection />)
      for (const preset of BACKGROUND_PALETTES) {
        expect(screen.getByRole('radio', { name: preset.label })).toBeInTheDocument()
      }
    })

    it('marks the current background preset as checked', () => {
      useReportStore.setState((state) => ({ settings: { ...state.settings, background: 'salvia' } }))
      render(<AppearanceSection />)

      expect(screen.getByRole('radio', { name: 'Salvia' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'Neutro' })).toHaveAttribute('aria-checked', 'false')
    })

    it('selecting a swatch persists the preset via reportStore.updateSettings', async () => {
      const user = userEvent.setup()
      render(<AppearanceSection />)

      await user.click(screen.getByRole('radio', { name: 'Arena' }))

      expect(useReportStore.getState().settings.background).toBe('arena')
    })
  })
})
