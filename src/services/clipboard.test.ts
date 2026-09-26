import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyReport } from './clipboard'

/**
 * Clipboard contract (report-format.md): primary path writes both
 * text/plain and text/html via ClipboardItem; falls back to
 * navigator.clipboard.writeText(plain) when ClipboardItem/write is
 * unavailable or throws.
 */

const PLAIN = '*26/09/2026*\n\nHola'
const HTML = '<b>26/09/2026</b><br><br>Hola'

function stubNavigatorClipboard(clipboard: Partial<Clipboard> | undefined): void {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('copyReport', () => {
  it('writes both text/plain and text/html via ClipboardItem when available', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    stubNavigatorClipboard({ write })
    const ClipboardItemCtor = vi.fn(function (this: object, parts: Record<string, Blob>) {
      Object.assign(this, { parts })
    })
    vi.stubGlobal('ClipboardItem', ClipboardItemCtor)

    const result = await copyReport(PLAIN, HTML)

    expect(result).toEqual({ ok: true, method: 'clipboard-item' })
    expect(ClipboardItemCtor).toHaveBeenCalledTimes(1)
    const parts = ClipboardItemCtor.mock.calls[0]?.[0] as Record<string, Blob>
    expect(parts['text/plain']).toBeInstanceOf(Blob)
    expect(parts['text/html']).toBeInstanceOf(Blob)
    expect(await parts['text/plain']?.text()).toBe(PLAIN)
    expect(await parts['text/html']?.text()).toBe(HTML)
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('falls back to writeText when ClipboardItem is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigatorClipboard({ writeText })
    vi.stubGlobal('ClipboardItem', undefined)

    const result = await copyReport(PLAIN, HTML)

    expect(result).toEqual({ ok: true, method: 'write-text' })
    expect(writeText).toHaveBeenCalledWith(PLAIN)
  })

  it('falls back to writeText when navigator.clipboard.write throws', async () => {
    const write = vi.fn().mockRejectedValue(new Error('denied'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubNavigatorClipboard({ write, writeText })
    vi.stubGlobal(
      'ClipboardItem',
      vi.fn(function (this: object, parts: Record<string, Blob>) {
        Object.assign(this, { parts })
      }),
    )

    const result = await copyReport(PLAIN, HTML)

    expect(result).toEqual({ ok: true, method: 'write-text' })
    expect(writeText).toHaveBeenCalledWith(PLAIN)
  })

  it('returns an error result when every copy path fails', async () => {
    const write = vi.fn().mockRejectedValue(new Error('denied'))
    const writeText = vi.fn().mockRejectedValue(new Error('denied again'))
    stubNavigatorClipboard({ write, writeText })
    vi.stubGlobal(
      'ClipboardItem',
      vi.fn(function (this: object, parts: Record<string, Blob>) {
        Object.assign(this, { parts })
      }),
    )

    const result = await copyReport(PLAIN, HTML)

    expect(result).toEqual({ ok: false, method: 'none', error: 'denied again' })
  })

  it('returns an error result when navigator.clipboard itself is unavailable', async () => {
    stubNavigatorClipboard(undefined)

    const result = await copyReport(PLAIN, HTML)

    expect(result.ok).toBe(false)
    expect(result.method).toBe('none')
  })
})
