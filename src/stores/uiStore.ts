import { create } from 'zustand'
import type { EntryTypeId } from '@/types/entryTypeIds'

/**
 * UI-only state (CLAUDE.md architecture rules): dialogs/selection/drafts,
 * kept separate from persisted data (reportStore). Theme is NOT here — it
 * lives in Settings and is handled via reportStore/settings.repository (T6).
 */

export interface UiStoreState {
  isAddSheetOpen: boolean
  selectedType: EntryTypeId | null
  /** True when the add sheet was opened via the "Denuncia" quick tile — the entry form defaults `denounced` to true. */
  denouncedPreset: boolean
  editingEntryId: string | null
  previewOpen: boolean

  openAddSheet: (type?: EntryTypeId, denouncedPreset?: boolean) => void
  closeAddSheet: () => void
  startEdit: (id: string) => void
  stopEdit: () => void
  togglePreview: () => void
}

export const useUiStore = create<UiStoreState>((set) => ({
  isAddSheetOpen: false,
  selectedType: null,
  denouncedPreset: false,
  editingEntryId: null,
  previewOpen: false,

  openAddSheet: (type, denouncedPreset) =>
    set({ isAddSheetOpen: true, selectedType: type ?? null, denouncedPreset: denouncedPreset ?? false }),
  closeAddSheet: () => set({ isAddSheetOpen: false, selectedType: null, denouncedPreset: false }),
  startEdit: (id) => set({ editingEntryId: id }),
  stopEdit: () => set({ editingEntryId: null }),
  togglePreview: () => set((state) => ({ previewOpen: !state.previewOpen })),
}))
