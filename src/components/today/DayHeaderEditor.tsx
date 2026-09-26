import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useReportStore } from '@/stores/reportStore'

/**
 * The day header (domain.md `DailyReport.header`): free-text shift info
 * shown verbatim near the top of the generated report. Saves on blur so
 * typing never triggers a persistence round-trip per keystroke.
 */
export function DayHeaderEditor() {
  const header = useReportStore((state) => state.report?.header ?? '')
  const updateHeader = useReportStore((state) => state.updateHeader)
  const [value, setValue] = useState(header)
  // Tracks the last `header` we synced from, so the draft is reset when the
  // underlying report changes (e.g. after `load()`) without an effect —
  // "adjusting state during render" per https://react.dev/learn/you-might-not-need-an-effect.
  const [syncedHeader, setSyncedHeader] = useState(header)

  if (header !== syncedHeader) {
    setSyncedHeader(header)
    setValue(header)
  }

  function handleBlur() {
    if (value !== header) {
      void updateHeader(value)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="day-header" className="sr-only">
        Encabezado del día
      </Label>
      <Textarea
        id="day-header"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
        placeholder="G. 28. Ruesga, Bazan. 19hs descanso."
        rows={2}
        className="min-h-0 resize-none border-none bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
      />
    </div>
  )
}
