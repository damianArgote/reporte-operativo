import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useReportDocument } from '@/stores/reportStore'
import { useUiStore } from '@/stores/uiStore'
import { renderBlocks } from './spanRenderer'
import { useCopyReport } from './useCopyReport'

/**
 * "Vista previa": renders the ReportDocument model directly as React
 * elements (report-format.md "Preview contract") — never
 * dangerouslySetInnerHTML — so what's shown here matches what "Copiar"
 * writes to the clipboard.
 */
export function PreviewSheet() {
  const previewOpen = useUiStore((state) => state.previewOpen)
  const togglePreview = useUiStore((state) => state.togglePreview)
  const doc = useReportDocument()
  const copy = useCopyReport()

  return (
    <Sheet
      open={previewOpen}
      onOpenChange={(next) => {
        if (!next) togglePreview()
      }}
    >
      <SheetContent side="bottom" className="mx-auto max-h-[85svh] w-full max-w-md overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Vista previa</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4 text-sm">{doc ? renderBlocks(doc.blocks) : null}</div>
        <SheetFooter>
          <Button size="lg" className="h-11" onClick={() => void copy()}>
            Copiar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
