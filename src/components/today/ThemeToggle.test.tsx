import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReportStore } from '@/stores/reportStore'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { ThemeToggle } from './ThemeToggle'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as MediaQueryList)
}

describe('ThemeToggle', () => {
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
  })

  it('renders a button labeled "Tema"', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Tema' })).toBeInTheDocument()
  })

  it('lets the user pick "Oscuro" and persists it via reportStore.updateSettings', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Tema' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Oscuro' }))

    expect(useReportStore.getState().settings.theme).toBe('dark')
  })

  it('lets the user pick "Sistema"', async () => {
    useReportStore.setState((state) => ({ settings: { ...state.settings, theme: 'dark' } }))
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: 'Tema' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Sistema' }))

    expect(useReportStore.getState().settings.theme).toBe('system')
  })
})
