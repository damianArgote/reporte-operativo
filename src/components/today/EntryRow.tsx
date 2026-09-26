import { createElement } from 'react'
import { MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getRegistryIcon } from '@/components/icon-map'
import { getEntryTypeConfig } from '@/domain/entryTypeRegistry'
import { renderEntrySpans, renderNumberedEntrySpans } from '@/services/reportGenerator'
import { useReportStore } from '@/stores/reportStore'
import { useUiStore } from '@/stores/uiStore'
import type { DailyEntry, Settings } from '@/types/schemas'
import { renderSpans } from './spanRenderer'

interface EntryRowProps {
  entry: DailyEntry
  number?: number
  settings: Settings
}

export function EntryRow({ entry, number, settings }: EntryRowProps) {
  const removeEntry = useReportStore((state) => state.removeEntry)
  const duplicateEntry = useReportStore((state) => state.duplicateEntry)
  const restoreEntry = useReportStore((state) => state.restoreEntry)
  const startEdit = useUiStore((state) => state.startEdit)

  const config = getEntryTypeConfig(entry.type)
  // Resolved dynamically per entry type — rendered via createElement (not a
  // JSX tag) since it isn't a statically-known component reference.
  const icon = createElement(getRegistryIcon(config.icon), {
    className: 'mt-0.5 size-4 shrink-0 text-muted-foreground',
    'aria-hidden': true,
  })
  const spans =
    number !== undefined
      ? renderNumberedEntrySpans(entry, settings, number)
      : renderEntrySpans(entry, settings)

  async function handleDelete() {
    await removeEntry(entry.id)
    toast('Registro eliminado', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          void restoreEntry(entry)
        },
      },
    })
  }

  return (
    <li className="flex items-start gap-2 border-b border-border py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => startEdit(entry.id)}
        className="flex min-h-11 min-w-0 flex-1 items-start gap-2 rounded-md text-left"
        aria-label={`Editar registro de las ${entry.time}`}
      >
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="tabular-nums">{entry.time}</span>
            <span>·</span>
            <span>{config.label}</span>
            {entry.denounced && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[0.65rem]">
                Denuncia
              </Badge>
            )}
            {!entry.includeInReport && (
              <Badge variant="outline" className="h-4 px-1.5 text-[0.65rem]">
                No va al reporte
              </Badge>
            )}
          </div>
          <p className="text-sm wrap-break-word whitespace-pre-wrap">{renderSpans(spans)}</p>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Más acciones"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => startEdit(entry.id)}>Editar</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void duplicateEntry(entry.id)}>Duplicar</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => void handleDelete()}>
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
