import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { resetDatabase } from '@/db/database'
import { selectPlainText, useReportStore } from '@/stores/reportStore'
import { formatDisplayDate, todayKey } from '@/utils/dates'
import App from './App'

/**
 * Today screen (T5) integration tests — real store + fake-indexeddb
 * (reset between tests), per odd/tasks/m1-mvp.md's T5 acceptance list.
 */

function stubClipboard() {
  const write = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(window.navigator, 'clipboard', { value: { write }, configurable: true })
  vi.stubGlobal(
    'ClipboardItem',
    vi.fn(function (this: object, parts: Record<string, Blob>) {
      Object.assign(this, { parts })
    }),
  )
  return write
}

function entryList() {
  return screen.getByRole('list', { name: /registros del día/i })
}

async function addLp(user: UserEvent, plate: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: /nuevo registro/i }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'LP' }))

  await user.type(within(dialog).getByLabelText('Patente'), plate)
  await user.type(within(dialog).getByLabelText('Calle'), 'Calle')
  await user.type(within(dialog).getByLabelText('Altura'), '100')
  await user.click(within(dialog).getByRole('button', { name: 'Agregar' }))

  await screen.findByText(new RegExp(plate, 'i'))
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('App — Today screen', () => {
  it("shows today's date, formatted DD/MM/YYYY", async () => {
    render(<App />)

    expect(await screen.findByText(formatDisplayDate(todayKey()))).toBeInTheDocument()
  })

  it('quick bar: typing text and pressing Enter adds a free entry, visible in the list and the preview', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(formatDisplayDate(todayKey()))

    const quickInput = screen.getByRole('textbox', { name: /escribir novedad/i })
    await user.type(quickInput, 'Corte de luz en la cuadra{Enter}')

    expect(await screen.findByText('Corte de luz en la cuadra')).toBeInTheDocument()
    expect(quickInput).toHaveValue('')

    await user.click(screen.getByRole('button', { name: /vista previa/i }))
    const preview = await screen.findByRole('dialog')
    expect(within(preview).getByText(/Corte de luz en la cuadra/)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
    }
  })

  it('FAB -> LP -> fill fields -> Agregar shows the numbered row and updates the counters', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(formatDisplayDate(todayKey()))

    await user.click(screen.getByRole('button', { name: /nuevo registro/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'LP' }))

    await user.type(within(dialog).getByLabelText('Patente'), 'ohm949')
    await user.type(within(dialog).getByLabelText('Calle'), 'Av Luis María Campos')
    await user.type(within(dialog).getByLabelText('Altura'), '1270')
    await user.click(within(dialog).getByRole('button', { name: 'Agregar' }))

    expect(
      await screen.findByText('1. OHM949 un LP en Av Luis María Campos 1270.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Hoy 1 a playa/)).toBeInTheDocument()
  })

  it('adding 3 LP entries then deleting the 2nd renumbers 1./2. and updates counters; Deshacer restores it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(formatDisplayDate(todayKey()))

    await addLp(user, 'AAA111')
    await addLp(user, 'BBB222')
    await addLp(user, 'CCC333')

    expect(screen.getByText(/Hoy 3 a playa/)).toBeInTheDocument()

    const rows = within(entryList()).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    const secondRow = rows[1]!
    expect(within(secondRow).getByText(/BBB222/)).toBeInTheDocument()

    await user.click(within(secondRow).getByRole('button', { name: /más acciones/i }))
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))

    // removeEntry is fire-and-forget from the row menu's onClick (persists,
    // then reloads entries) — wait for the commit instead of asserting
    // synchronously right after the click (it may have already committed by
    // now, so plain waitFor — not waitForElementToBeRemoved, which requires
    // the element to still be present on its first check).
    await waitFor(() => expect(screen.queryByText(/BBB222/)).not.toBeInTheDocument())
    expect(await screen.findByText('1. AAA111 un LP en Calle 100.')).toBeInTheDocument()
    expect(await screen.findByText('2. CCC333 un LP en Calle 100.')).toBeInTheDocument()
    expect(screen.getByText(/Hoy 2 a playa/)).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /deshacer/i }))

    expect(await screen.findByText(/BBB222/)).toBeInTheDocument()
    expect(await screen.findByText('1. AAA111 un LP en Calle 100.')).toBeInTheDocument()
    expect(await screen.findByText('2. BBB222 un LP en Calle 100.')).toBeInTheDocument()
    expect(await screen.findByText('3. CCC333 un LP en Calle 100.')).toBeInTheDocument()
    expect(screen.getByText(/Hoy 3 a playa/)).toBeInTheDocument()
  })

  it('editing an entry changes the preview text', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(formatDisplayDate(todayKey()))

    await addLp(user, 'AAA111')

    await user.click(await screen.findByText('1. AAA111 un LP en Calle 100.'))
    const dialog = await screen.findByRole('dialog')
    const plateInput = within(dialog).getByLabelText('Patente')
    await user.clear(plateInput)
    await user.type(plateInput, 'zzz999')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('1. ZZZ999 un LP en Calle 100.')).toBeInTheDocument()
    expect(screen.queryByText(/AAA111/)).not.toBeInTheDocument()
  })

  it('duplicating an entry creates a second row', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(formatDisplayDate(todayKey()))

    await addLp(user, 'AAA111')

    await user.click(screen.getByRole('button', { name: /más acciones/i }))
    await user.click(await screen.findByRole('menuitem', { name: 'Duplicar' }))

    expect(await screen.findByText('1. AAA111 un LP en Calle 100.')).toBeInTheDocument()
    expect(await screen.findByText('2. AAA111 un LP en Calle 100.')).toBeInTheDocument()
    expect(within(entryList()).getAllByRole('listitem')).toHaveLength(2)
  })

  it('Copiar writes clipboard text/plain exactly equal to the rendered WhatsApp text', async () => {
    // userEvent.setup() installs its own navigator.clipboard stub (for
    // user.copy()/paste()), which would otherwise clobber ours — set up
    // userEvent first, then stub the clipboard afterwards so ours wins.
    const user = userEvent.setup()
    const write = stubClipboard()
    render(<App />)
    await screen.findByText(formatDisplayDate(todayKey()))

    await addLp(user, 'AAA111')

    await user.click(screen.getByRole('button', { name: /^copiar$/i }))

    expect(write).toHaveBeenCalledTimes(1)
    const item = write.mock.calls[0]?.[0]?.[0] as { parts: Record<string, Blob> }
    const plainText = await item.parts['text/plain']?.text()
    const expected = selectPlainText(useReportStore.getState())
    expect(plainText).toBe(expected)
    expect(await screen.findByText(/copiado/i)).toBeInTheDocument()
  })

  it('"Configuración" opens the settings screen; "Volver" returns to Today', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(formatDisplayDate(todayKey()))

    await user.click(screen.getByRole('button', { name: 'Configuración' }))

    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
    expect(screen.queryByText(formatDisplayDate(todayKey()))).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(await screen.findByText(formatDisplayDate(todayKey()))).toBeInTheDocument()
  })

  it('shows "Hola, {nombre}" in the Today header once Settings.userName is set', async () => {
    render(<App />)
    await screen.findByText(formatDisplayDate(todayKey()))
    expect(screen.queryByText(/^Hola,/)).not.toBeInTheDocument()

    await useReportStore.getState().updateSettings({ userName: 'Damian' })

    expect(await screen.findByText('Hola, Damian')).toBeInTheDocument()
  })
})
