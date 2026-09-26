/**
 * Rich clipboard copy (report-format.md "Clipboard contract"): writes both
 * `text/plain` (renderWhatsAppText) and `text/html` (renderHtml) at once via
 * `ClipboardItem`, falling back to `navigator.clipboard.writeText(plain)`
 * when `ClipboardItem`/`clipboard.write` is unavailable or throws (older
 * browsers, denied permission).
 */

export type CopyReportMethod = 'clipboard-item' | 'write-text' | 'none'

export interface CopyReportResult {
  ok: boolean
  method: CopyReportMethod
  error?: string
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function tryWriteText(plain: string): Promise<CopyReportResult> {
  const clipboard = navigator.clipboard
  if (!clipboard?.writeText) {
    return { ok: false, method: 'none', error: 'Clipboard API unavailable' }
  }
  try {
    await clipboard.writeText(plain)
    return { ok: true, method: 'write-text' }
  } catch (error) {
    return { ok: false, method: 'none', error: messageOf(error) }
  }
}

/**
 * Copies `plain`/`html` to the clipboard. Primary path: one `ClipboardItem`
 * carrying both MIME flavors. Falls back to `writeText(plain)` when
 * `ClipboardItem` or `clipboard.write` don't exist, or when `write` throws
 * (e.g. permission denied) — never surfaces the primary-path failure if the
 * fallback succeeds.
 */
export async function copyReport(plain: string, html: string): Promise<CopyReportResult> {
  const clipboard = navigator.clipboard
  const ClipboardItemCtor = globalThis.ClipboardItem

  if (clipboard?.write && ClipboardItemCtor) {
    try {
      const item = new ClipboardItemCtor({
        'text/plain': new Blob([plain], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })
      await clipboard.write([item])
      return { ok: true, method: 'clipboard-item' }
    } catch {
      return tryWriteText(plain)
    }
  }

  return tryWriteText(plain)
}
