import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TodayScreen } from '@/components/today/TodayScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { useBackgroundPalette } from '@/features/settings/useBackgroundPalette'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useReportStore } from '@/stores/reportStore'
import { initNavigationSync, useUiStore } from '@/stores/uiStore'

function App() {
  const status = useReportStore((state) => state.status)
  const error = useReportStore((state) => state.error)
  const load = useReportStore((state) => state.load)
  const view = useUiStore((state) => state.view)
  // Applies Settings.theme (light/dark/system) and Settings.background to
  // <html> for the whole app, including the loading/error states below
  // (T6a / T2).
  useResolvedTheme()
  useBackgroundPalette()

  useEffect(() => {
    void load()
  }, [load])

  // Keeps uiStore.view in sync with the browser/Android back-forward stack
  // (T1): navigate() pushes a history entry, this reacts to the resulting
  // hashchange/popstate when the user goes back/forward instead.
  useEffect(() => initNavigationSync(), [])

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
        view === 'settings' ? (
          <SettingsScreen />
        ) : (
          <TodayScreen />
        )
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
