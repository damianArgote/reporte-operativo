import { ChevronLeft } from 'lucide-react'
import { getRegistryIcon } from '@/components/icon-map'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/uiStore'
import { SETTINGS_SECTIONS } from './settingsSections'

/**
 * "Configuración" screen (T1): a header with a back button, then every
 * section from SETTINGS_SECTIONS in order — grouped by heading, not cards,
 * consistent with the Today screen's layout language.
 */
export function SettingsScreen() {
  const navigate = useUiStore((state) => state.navigate)

  return (
    <div className="relative mx-auto flex min-h-svh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-border bg-background/95 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Volver"
          onClick={() => navigate('today')}
          className="size-11"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-semibold">Configuración</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col gap-8">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = getRegistryIcon(section.icon)
            const Section = section.component
            const headingId = `settings-${section.id}-title`

            return (
              <section key={section.id} aria-labelledby={headingId} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <h2
                    id={headingId}
                    className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                  >
                    {section.title}
                  </h2>
                </div>
                {section.description && (
                  <p className="-mt-2 text-xs text-muted-foreground">{section.description}</p>
                )}
                <Section />
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
