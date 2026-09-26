import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useResolvedTheme } from '@/hooks/useTheme'
import { useReportStore } from '@/stores/reportStore'
import type { Settings } from '@/types/schemas'

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const satisfies Record<Settings['theme'], typeof Sun>

/**
 * Compact theme control (T6a): light | dark | system, persisted via
 * `reportStore.updateSettings` (Settings.theme in IndexedDB — the single
 * source of truth). The trigger icon reflects the *resolved* theme so it
 * still makes sense when the setting is "system".
 */
export function ThemeToggle() {
  const theme = useReportStore((state) => state.settings.theme)
  const updateSettings = useReportStore((state) => state.updateSettings)
  const resolved = useResolvedTheme()
  const Icon = THEME_ICONS[resolved]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Tema">
          <Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => void updateSettings({ theme: value as Settings['theme'] })}
        >
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" /> Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" /> Oscuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" /> Sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
