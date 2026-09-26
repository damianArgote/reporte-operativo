import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TodayScreen } from '@/components/today/TodayScreen'
import { useReportStore } from '@/stores/reportStore'

function App() {
  const status = useReportStore((state) => state.status)
  const error = useReportStore((state) => state.error)
  const load = useReportStore((state) => state.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      {status === 'error' ? (
        <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-sm text-muted-foreground">Ocurrió un error al cargar el reporte de hoy.</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="button"
            className="text-sm font-medium underline"
            onClick={() => void load()}
          >
            Reintentar
          </button>
        </main>
      ) : status === 'ready' ? (
        <TodayScreen />
      ) : (
        <main className="flex min-h-svh items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">Cargando…</p>
        </main>
      )}
      <Toaster />
    </>
  )
}

export default App
