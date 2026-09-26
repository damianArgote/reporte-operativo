import { toast } from 'sonner'
import { copyReport } from '@/services/clipboard'
import { useHtml, usePlainText } from '@/stores/reportStore'

/**
 * Copies the current report (both clipboard flavors, see services/clipboard)
 * and surfaces the result as a toast. Shared by the header's "Copiar" button
 * and the preview sheet's footer button — one path, one toast copy.
 */
export function useCopyReport(): () => Promise<void> {
  const plain = usePlainText()
  const html = useHtml()

  return async function copy() {
    const result = await copyReport(plain, html)
    if (result.ok) {
      toast.success('✓ Copiado')
    } else {
      toast.error('No se pudo copiar el reporte')
    }
  }
}
