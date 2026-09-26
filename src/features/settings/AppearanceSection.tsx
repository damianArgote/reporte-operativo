import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useReportStore } from '@/stores/reportStore'
import type { Settings } from '@/types/schemas'
import { BACKGROUND_PALETTES } from './backgroundPalette'

const THEME_OPTIONS: { value: Settings['theme']; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

/**
 * "Apariencia" section (T2): theme control (moved here from the Today
 * header's old ThemeToggle) plus the background palette swatch picker.
 * Both persist immediately via reportStore.updateSettings (Settings in
 * IndexedDB, the single source of truth) — no separate "Guardar" step.
 */
export function AppearanceSection() {
  const theme = useReportStore((state) => state.settings.theme)
  const background = useReportStore((state) => state.settings.background)
  const updateSettings = useReportStore((state) => state.updateSettings)
  const resolvedTheme = useResolvedTheme()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label className="text-sm">Tema</Label>
        <RadioGroup
          value={theme}
          onValueChange={(value) => void updateSettings({ theme: value as Settings['theme'] })}
          className="grid grid-cols-3 gap-2"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <div
              key={value}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-2"
            >
              <RadioGroupItem id={`theme-${value}`} value={value} className="sr-only" />
              <Label htmlFor={`theme-${value}`} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 text-sm">
                <Icon className="size-4" />
                {label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm">Color de fondo</Label>
        <div role="radiogroup" aria-label="Color de fondo" className="flex flex-wrap gap-3">
          {BACKGROUND_PALETTES.map((preset) => {
            const selected = background === preset.id
            const swatch = resolvedTheme === 'dark' ? preset.dark.background : preset.light.background

            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={preset.label}
                onClick={() => void updateSettings({ background: preset.id })}
                className="flex size-11 items-center justify-center rounded-full border border-border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                style={{ backgroundColor: swatch }}
              >
                {selected && <Check className="size-4 text-foreground" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
