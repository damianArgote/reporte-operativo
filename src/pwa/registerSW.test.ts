import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'

const registerSWMock = vi.fn()

vi.mock('virtual:pwa-register', () => ({
  registerSW: (options: { onNeedRefresh?: () => void }) => {
    registerSWMock(options)
    return vi.fn().mockResolvedValue(undefined)
  },
}))

vi.mock('sonner', () => ({ toast: vi.fn() }))

describe('setupPwaUpdatePrompt', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows a non-invasive "Nueva versión disponible" toast on onNeedRefresh, instead of forcing a reload', async () => {
    const { setupPwaUpdatePrompt } = await import('./registerSW')
    setupPwaUpdatePrompt()

    expect(registerSWMock).toHaveBeenCalledTimes(1)
    const call = registerSWMock.mock.calls.at(0)
    if (!call) throw new Error('registerSW was not called')
    const { onNeedRefresh } = call[0] as { onNeedRefresh: () => void }
    onNeedRefresh()

    expect(toast).toHaveBeenCalledWith('Nueva versión disponible', expect.objectContaining({ duration: Infinity }))
  })
})
