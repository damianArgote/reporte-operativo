import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReportStore } from '@/stores/reportStore'
import { DEFAULT_SETTINGS, type CustomBackground } from '@/types/schemas'
import { oklchToHex } from '@/utils/color'
import { AppearanceSection } from './AppearanceSection'
import { BACKGROUND_PALETTES } from './backgroundPalette'

const NEUTRAL_LIGHT_HEX = oklchToHex(BACKGROUND_PALETTES[0]!.light.background)
const NEUTRAL_DARK_HEX = oklchToHex(BACKGROUND_PALETTES[0]!.dark.background)

const CUSTOM_A: CustomBackground = {
  id: 'custom-11111111-1111-4111-8111-111111111111',
  light: '#fafafa',
  dark: '#222222',
}

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

  describe('custom backgrounds', () => {
    it('renders one swatch per custom background, after the presets, with a Spanish ordinal label', () => {
      useReportStore.setState((state) => ({
        settings: { ...state.settings, customBackgrounds: [CUSTOM_A] },
      }))
      render(<AppearanceSection />)

      expect(screen.getByRole('radio', { name: 'Color personalizado 1' })).toBeInTheDocument()
    })

    it('marks the selected custom background as checked', () => {
      useReportStore.setState((state) => ({
        settings: { ...state.settings, background: CUSTOM_A.id, customBackgrounds: [CUSTOM_A] },
      }))
      render(<AppearanceSection />)

      expect(screen.getByRole('radio', { name: 'Color personalizado 1' })).toHaveAttribute('aria-checked', 'true')
    })

    it('selecting a custom swatch persists it via reportStore.updateSettings', async () => {
      useReportStore.setState((state) => ({
        settings: { ...state.settings, customBackgrounds: [CUSTOM_A] },
      }))
      const user = userEvent.setup()
      render(<AppearanceSection />)

      await user.click(screen.getByRole('radio', { name: 'Color personalizado 1' }))

      expect(useReportStore.getState().settings.background).toBe(CUSTOM_A.id)
    })

    it('shows a delete affordance only for the selected custom background, and deleting it falls back to "neutral"', async () => {
      useReportStore.setState((state) => ({
        settings: { ...state.settings, background: CUSTOM_A.id, customBackgrounds: [CUSTOM_A] },
      }))
      const user = userEvent.setup()
      render(<AppearanceSection />)

      const deleteButton = screen.getByRole('button', { name: 'Eliminar color personalizado 1' })
      await user.click(deleteButton)

      expect(useReportStore.getState().settings.background).toBe('neutral')
      expect(useReportStore.getState().settings.customBackgrounds).toEqual([])
    })

    it('does not show a delete affordance for a custom background that is not selected', () => {
      useReportStore.setState((state) => ({
        settings: { ...state.settings, background: 'neutral', customBackgrounds: [CUSTOM_A] },
      }))
      render(<AppearanceSection />)

      expect(screen.queryByRole('button', { name: 'Eliminar color personalizado 1' })).not.toBeInTheDocument()
    })

    it('renders a "Crear color" button that opens an inline editor seeded from the current effective background', async () => {
      const user = userEvent.setup()
      render(<AppearanceSection />)

      await user.click(screen.getByRole('button', { name: 'Crear color' }))

      const lightInput = screen.getByLabelText('Fondo claro') as HTMLInputElement
      const darkInput = screen.getByLabelText('Fondo oscuro') as HTMLInputElement
      expect(lightInput.value).toBe(NEUTRAL_LIGHT_HEX)
      expect(darkInput.value).toBe(NEUTRAL_DARK_HEX)
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    })

    it('shows "Se lee bien" for a color that already contrasts well, and the auto-adjust message otherwise', async () => {
      const user = userEvent.setup()
      render(<AppearanceSection />)
      await user.click(screen.getByRole('button', { name: 'Crear color' }))

      expect(screen.getAllByText('Se lee bien').length).toBeGreaterThan(0)

      const lightInput = screen.getByLabelText('Fondo claro')
      fireEvent.change(lightInput, { target: { value: '#1a1a1a' } })

      expect(screen.getByText('Poco contraste · el texto se ajusta automáticamente')).toBeInTheDocument()
    })

    it('"Cancelar" closes the editor without persisting anything', async () => {
      const user = userEvent.setup()
      render(<AppearanceSection />)
      await user.click(screen.getByRole('button', { name: 'Crear color' }))

      await user.click(screen.getByRole('button', { name: 'Cancelar' }))

      expect(screen.queryByLabelText('Fondo claro')).not.toBeInTheDocument()
      expect(useReportStore.getState().settings.customBackgrounds).toEqual([])
    })

    it('"Guardar" adds the custom background and selects it', async () => {
      const user = userEvent.setup()
      render(<AppearanceSection />)
      await user.click(screen.getByRole('button', { name: 'Crear color' }))

      fireEvent.change(screen.getByLabelText('Fondo claro'), { target: { value: '#eeeeee' } })
      fireEvent.change(screen.getByLabelText('Fondo oscuro'), { target: { value: '#111111' } })
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      const { customBackgrounds, background } = useReportStore.getState().settings
      expect(customBackgrounds).toHaveLength(1)
      expect(customBackgrounds[0]).toMatchObject({ light: '#eeeeee', dark: '#111111' })
      expect(background).toBe(customBackgrounds[0]!.id)
      expect(screen.queryByLabelText('Fondo claro')).not.toBeInTheDocument()
    })

    it('hides "Crear color" and shows a note once 8 custom backgrounds exist', () => {
      const eight = Array.from({ length: 8 }, (_, i) => ({
        id: `custom-${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
        light: '#fafafa',
        dark: '#222222',
      }))
      useReportStore.setState((state) => ({ settings: { ...state.settings, customBackgrounds: eight } }))
      render(<AppearanceSection />)

      expect(screen.queryByRole('button', { name: 'Crear color' })).not.toBeInTheDocument()
      expect(screen.getByText('Alcanzaste el máximo de 8 colores personalizados.')).toBeInTheDocument()
    })
  })
})
