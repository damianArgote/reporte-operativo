import { useState } from 'react'
import { Check, Monitor, Moon, Plus, Sun, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useReportStore } from '@/stores/reportStore'
import type { CustomBackground, Settings } from '@/types/schemas'
import { APP_FOREGROUND_HEX, resolveReadableForeground } from '@/utils/color'
import { BACKGROUND_PALETTES } from './backgroundPalette'
import {
  MAX_CUSTOM_BACKGROUNDS,
  createCustomBackgroundId,
  resolveEffectiveBackgroundHex,
} from './customBackgrounds'

const THEME_OPTIONS: { value: Settings['theme']; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

/**
 * A radio-semantics swatch button shared by presets and custom backgrounds:
 * a 44px circle, `role="radio"`, a checkmark tinted for legibility on the
 * swatch's own color when selected.
 *
 * `swatchCss` is whatever CSS color value paints the button (a preset's
 * `oklch(...)` value, or a custom background's `#rrggbb` hex) — presets
 * already guarantee ≥4.5:1 against the default foreground (backgroundPalette.test.ts),
 * so their checkmark just uses `--foreground` via `checkColorHex: null`.
 * A custom background's checkmark instead uses a precomputed readable color
 * (`checkColorHex`, from resolveReadableForeground on its real hex value).
 */
function SwatchButton({
  label,
  selected,
  swatchCss,
  checkColorHex,
  onSelect,
}: {
  label: string
  selected: boolean
  swatchCss: string
  checkColorHex: string | null
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className="flex size-11 items-center justify-center rounded-full border border-border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      style={{ backgroundColor: swatchCss }}
    >
      {selected && (
        <Check
          className={checkColorHex ? 'size-4' : 'size-4 text-foreground'}
          style={checkColorHex ? { color: checkColorHex } : undefined}
          aria-hidden="true"
        />
      )}
    </button>
  )
}

/** Preview swatch for the "Crear color" editor: sample text plus a contrast readout. */
function ColorPreview({ hex, defaultForegroundHex }: { hex: string; defaultForegroundHex: string }) {
  const resolved = resolveReadableForeground(hex, defaultForegroundHex)
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border border-border p-2"
      style={{ backgroundColor: hex, color: resolved.foreground }}
    >
      <span className="text-sm">Texto de muestra</span>
      <span className="text-xs">
        {resolved.overridden ? 'Poco contraste · el texto se ajusta automáticamente' : 'Se lee bien'}
      </span>
    </div>
  )
}

/**
 * "Apariencia" section (T2): theme control (moved here from the Today
 * header's old ThemeToggle) plus the background palette swatch picker.
 * T4 adds custom background colors after the presets, in the same swatch
 * grid, plus the "Crear color" inline editor. Both persist immediately via
 * reportStore.updateSettings (Settings in IndexedDB, the single source of
 * truth) — no separate "Guardar" step for theme/preset selection.
 */
export function AppearanceSection() {
  const theme = useReportStore((state) => state.settings.theme)
  const background = useReportStore((state) => state.settings.background)
  const customBackgrounds = useReportStore((state) => state.settings.customBackgrounds)
  const updateSettings = useReportStore((state) => state.updateSettings)
  const resolvedTheme = useResolvedTheme()
  const defaultForegroundHex = APP_FOREGROUND_HEX[resolvedTheme]

  const [isCreating, setIsCreating] = useState(false)
  const [draftLight, setDraftLight] = useState('#ffffff')
  const [draftDark, setDraftDark] = useState('#000000')

  const canCreateMore = customBackgrounds.length < MAX_CUSTOM_BACKGROUNDS

  function openEditor() {
    setDraftLight(resolveEffectiveBackgroundHex(background, customBackgrounds, 'light'))
    setDraftDark(resolveEffectiveBackgroundHex(background, customBackgrounds, 'dark'))
    setIsCreating(true)
  }

  function closeEditor() {
    setIsCreating(false)
  }

  async function handleSave() {
    const entry: CustomBackground = { id: createCustomBackgroundId(), light: draftLight, dark: draftDark }
    await updateSettings({ customBackgrounds: [...customBackgrounds, entry], background: entry.id })
    setIsCreating(false)
  }

  async function handleDelete(id: string) {
    const remaining = customBackgrounds.filter((custom) => custom.id !== id)
    const patch: Partial<Settings> = { customBackgrounds: remaining }
    if (background === id) patch.background = 'neutral'
    await updateSettings(patch)
  }

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

      <div className="flex flex-col gap-3">
        <Label className="text-sm">Color de fondo</Label>
        <div role="radiogroup" aria-label="Color de fondo" className="flex flex-wrap gap-3">
          {BACKGROUND_PALETTES.map((preset) => {
            const swatch = resolvedTheme === 'dark' ? preset.dark.background : preset.light.background
            return (
              <SwatchButton
                key={preset.id}
                label={preset.label}
                selected={background === preset.id}
                swatchCss={swatch}
                checkColorHex={null}
                onSelect={() => void updateSettings({ background: preset.id })}
              />
            )
          })}

          {customBackgrounds.map((custom, index) => {
            const selected = background === custom.id
            const swatchHex = resolvedTheme === 'dark' ? custom.dark : custom.light
            const ordinal = index + 1
            return (
              <div key={custom.id} className="relative">
                <SwatchButton
                  label={`Color personalizado ${ordinal}`}
                  selected={selected}
                  swatchCss={swatchHex}
                  checkColorHex={resolveReadableForeground(swatchHex, defaultForegroundHex).foreground}
                  onSelect={() => void updateSettings({ background: custom.id })}
                />
                {selected && (
                  <button
                    type="button"
                    aria-label={`Eliminar color personalizado ${ordinal}`}
                    onClick={() => void handleDelete(custom.id)}
                    className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border border-border bg-background text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {isCreating ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-background-light">Fondo claro</Label>
                <input
                  id="custom-background-light"
                  type="color"
                  value={draftLight}
                  onChange={(event) => setDraftLight(event.target.value)}
                  className="h-11 w-full cursor-pointer rounded-lg border border-input bg-transparent p-1"
                />
                <ColorPreview hex={draftLight} defaultForegroundHex={APP_FOREGROUND_HEX.light} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom-background-dark">Fondo oscuro</Label>
                <input
                  id="custom-background-dark"
                  type="color"
                  value={draftDark}
                  onChange={(event) => setDraftDark(event.target.value)}
                  className="h-11 w-full cursor-pointer rounded-lg border border-input bg-transparent p-1"
                />
                <ColorPreview hex={draftDark} defaultForegroundHex={APP_FOREGROUND_HEX.dark} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" className="h-11" onClick={closeEditor}>
                Cancelar
              </Button>
              <Button type="button" className="h-11" onClick={() => void handleSave()}>
                Guardar
              </Button>
            </div>
          </div>
        ) : canCreateMore ? (
          <Button type="button" variant="outline" className="h-11 w-fit" onClick={openEditor}>
            <Plus className="size-4" aria-hidden="true" />
            Crear color
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Alcanzaste el máximo de 8 colores personalizados.</p>
        )}
      </div>
    </div>
  )
}
