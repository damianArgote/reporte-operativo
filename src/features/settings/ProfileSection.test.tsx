import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReportStore } from '@/stores/reportStore'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { ProfileSection } from './ProfileSection'

describe('ProfileSection', () => {
  beforeEach(() => {
    useReportStore.setState({
      settings: DEFAULT_SETTINGS,
      updateSettings: vi.fn(async (patch) => {
        useReportStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
        return { ...useReportStore.getState().settings, ...patch }
      }),
    })
  })

  it('renders a "Nombre" input with a placeholder, seeded from the current setting', () => {
    useReportStore.setState((state) => ({ settings: { ...state.settings, userName: 'Damian' } }))
    render(<ProfileSection />)

    expect(screen.getByLabelText('Nombre')).toHaveValue('Damian')
    expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument()
  })

  it('saves the trimmed name on blur, via reportStore.updateSettings', async () => {
    const user = userEvent.setup()
    render(<ProfileSection />)

    const input = screen.getByLabelText('Nombre')
    await user.type(input, '  Damian  ')
    await user.tab()

    await waitFor(() => expect(useReportStore.getState().settings.userName).toBe('Damian'))
  })

  it('shows a subtle "Guardado" confirmation after a successful save', async () => {
    const user = userEvent.setup()
    render(<ProfileSection />)

    await user.type(screen.getByLabelText('Nombre'), 'Damian')
    await user.tab()

    expect(await screen.findByText('Guardado')).toBeInTheDocument()
  })

  it('does not call updateSettings when blurring without any change', async () => {
    useReportStore.setState((state) => ({ settings: { ...state.settings, userName: 'Damian' } }))
    const user = userEvent.setup()
    render(<ProfileSection />)

    screen.getByLabelText('Nombre').focus()
    await user.tab()

    expect(useReportStore.getState().updateSettings).not.toHaveBeenCalled()
  })
})
