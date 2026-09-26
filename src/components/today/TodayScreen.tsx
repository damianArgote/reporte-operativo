import { Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReportStore } from '@/stores/reportStore'
import { useUiStore } from '@/stores/uiStore'
import { formatDisplayDate, todayKey } from '@/utils/dates'
import { CountersStrip } from './CountersStrip'
import { DayHeaderEditor } from './DayHeaderEditor'
import { EntryList } from './EntryList'
import { EntrySheet } from './EntrySheet'
import { PreviewSheet } from './PreviewSheet'
import { QuickAddBar } from './QuickAddBar'
import { useCopyReport } from './useCopyReport'

/**
 * The Today screen (T5): mobile-first, one-hand thumb use. Layout, top to
 * bottom — sticky date/header/counters, a scrollable entry timeline, then a
 * pinned quick-add bar in the thumb zone with the "+" FAB just above it.
 */
export function TodayScreen() {
  const dateKey = useReportStore((state) => state.dateKey ?? todayKey())
  const userName = useReportStore((state) => state.settings.userName)
  const togglePreview = useUiStore((state) => state.togglePreview)
  const openAddSheet = useUiStore((state) => state.openAddSheet)
  const navigate = useUiStore((state) => state.navigate)
  const copy = useCopyReport()

  return (
    <div className="relative mx-auto flex min-h-svh max-w-md flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Hoy</p>
            <h1 className="text-3xl font-semibold tabular-nums">{formatDisplayDate(dateKey)}</h1>
            {userName && <p className="text-sm text-muted-foreground">Hola, {userName}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Configuración"
              onClick={() => navigate('settings')}
              className="size-11"
            >
              <Settings className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={togglePreview}>
              Vista previa
            </Button>
            <Button size="sm" onClick={() => void copy()}>
              Copiar
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <DayHeaderEditor />
        </div>
        <div className="mt-1">
          <CountersStrip />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-2 pb-36">
        <h2 className="sr-only">Registros del día</h2>
        <EntryList />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-background px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <QuickAddBar />
      </div>

      <Button
        size="icon"
        aria-label="Nuevo registro"
        onClick={() => openAddSheet()}
        className="fixed right-4 bottom-24 z-30 size-14 rounded-full shadow-lg"
      >
        <Plus className="size-6" />
      </Button>

      <EntrySheet />
      <PreviewSheet />
    </div>
  )
}
