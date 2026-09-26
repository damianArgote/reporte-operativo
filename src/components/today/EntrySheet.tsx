import { createElement } from 'react'
import { Siren } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getRegistryIcon } from '@/components/icon-map'
import { getEntryTypeConfig } from '@/domain/entryTypeRegistry'
import { useReportStore } from '@/stores/reportStore'
import { useUiStore } from '@/stores/uiStore'
import type { EntryTypeId } from '@/types/entryTypeIds'
import { EntryForm } from './EntryForm'

/**
 * Quick-add type grid order (T5 spec): LP, MI, OBRA, Infraccionado, then a
 * "Denuncia" tile, then Novedad. "Denuncia" isn't its own entry type
 * (domain.md: denounced is a flag on any entry, not a counted type) — per
 * the one confirmed real example (report-format.md golden fixture, KMB728:
 * a towed "Reservado de Obra" entry filed as a denuncia), this tile opens
 * the `construction` (OBRA) form with `denounced` preset to true, since
 * that is the only spec-evidenced denuncia scenario. See T5 hand-off notes
 * for this resolved ambiguity.
 */
const TYPE_TILES: Array<{ key: string; typeId: EntryTypeId; label: string; denouncedPreset?: boolean }> = [
  { key: 'lp', typeId: 'lp', label: getEntryTypeConfig('lp').pickerLabel },
  { key: 'mi', typeId: 'mi', label: getEntryTypeConfig('mi').pickerLabel },
  { key: 'construction', typeId: 'construction', label: getEntryTypeConfig('construction').pickerLabel },
  { key: 'ticketed', typeId: 'ticketed', label: getEntryTypeConfig('ticketed').pickerLabel },
  { key: 'denuncia', typeId: 'construction', label: 'Denuncia', denouncedPreset: true },
  { key: 'free', typeId: 'free', label: getEntryTypeConfig('free').pickerLabel },
]

function TypeGrid({ onSelect }: { onSelect: (typeId: EntryTypeId, denouncedPreset: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 py-2 min-[360px]:grid-cols-3">
      {TYPE_TILES.map((tile) => {
        // Resolved dynamically per tile — rendered via createElement (not a
        // JSX tag) since it isn't a statically-known component reference.
        const icon = createElement(
          tile.key === 'denuncia' ? Siren : getRegistryIcon(getEntryTypeConfig(tile.typeId).icon),
          { className: 'size-5', 'aria-hidden': true },
        )
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => onSelect(tile.typeId, tile.denouncedPreset ?? false)}
            className="flex min-h-20 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-border p-2 text-center text-sm font-medium transition-colors hover:bg-muted active:bg-muted"
          >
            {icon}
            {tile.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Single sheet driving both the two-step "add" flow (type grid, then that
 * type's form) and the one-step "edit" flow (uiStore.editingEntryId), so
 * both share one EntryForm implementation.
 */
export function EntrySheet() {
  const isAddSheetOpen = useUiStore((state) => state.isAddSheetOpen)
  const selectedType = useUiStore((state) => state.selectedType)
  const denouncedPreset = useUiStore((state) => state.denouncedPreset)
  const editingEntryId = useUiStore((state) => state.editingEntryId)
  const openAddSheet = useUiStore((state) => state.openAddSheet)
  const closeAddSheet = useUiStore((state) => state.closeAddSheet)
  const stopEdit = useUiStore((state) => state.stopEdit)

  const editingEntry = useReportStore((state) =>
    editingEntryId ? state.entries.find((entry) => entry.id === editingEntryId) : undefined,
  )

  const isEditing = editingEntryId !== null
  const open = isAddSheetOpen || isEditing

  function handleOpenChange(next: boolean) {
    if (next) return
    if (isEditing) stopEdit()
    else closeAddSheet()
  }

  let title = 'Nuevo registro'
  let body = <TypeGrid onSelect={(typeId, preset) => openAddSheet(typeId, preset)} />

  if (isEditing && editingEntry) {
    title = `Editar ${getEntryTypeConfig(editingEntry.type).label}`
    body = (
      <EntryForm
        typeId={editingEntry.type}
        mode="edit"
        initial={editingEntry}
        onCancel={stopEdit}
        onSubmitted={stopEdit}
      />
    )
  } else if (!isEditing && selectedType) {
    title = getEntryTypeConfig(selectedType).label
    body = (
      <EntryForm
        typeId={selectedType}
        mode="create"
        denouncedPreset={denouncedPreset}
        onCancel={closeAddSheet}
        onSubmitted={closeAddSheet}
      />
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[90svh] w-full max-w-md overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">{body}</div>
      </SheetContent>
    </Sheet>
  )
}
