import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useUiStore } from '@/stores/uiStore'
import { SettingsScreen } from './SettingsScreen'
import { SETTINGS_SECTIONS } from './settingsSections'

/**
 * Screen shell (T1): header ("Configuración" + "Volver" back button) plus
 * every section from the registry, in order — using the REAL registry, so
 * adding a section here is exercised the same way it will be in production.
 */
describe('SettingsScreen', () => {
  it('renders a "Configuración" heading and a "Volver" back button', () => {
    render(<SettingsScreen />)

    expect(screen.getByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('renders every section from the registry, in order', () => {
    render(<SettingsScreen />)

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings).toEqual(SETTINGS_SECTIONS.map((section) => section.title))
  })

  it('renders the "Apariencia" and "Perfil" sections', () => {
    render(<SettingsScreen />)

    expect(screen.getByRole('heading', { name: 'Apariencia' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Perfil' })).toBeInTheDocument()
  })

  it('clicking "Volver" navigates back to "today"', async () => {
    const user = userEvent.setup()
    useUiStore.getState().navigate('settings')
    render(<SettingsScreen />)

    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(useUiStore.getState().view).toBe('today')
  })
})
