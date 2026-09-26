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
  editingEntryId: string | null
  previewOpen: boolean

  openAddSheet: (type?: EntryTypeId) => void
  closeAddSheet: () => void
  startEdit: (id: string) => void
  stopEdit: () => void
  togglePreview: () => void
}

export const useUiStore = create<UiStoreState>((set) => ({
  isAddSheetOpen: false,
  selectedType: null,
  editingEntryId: null,
  previewOpen: false,

  openAddSheet: (type) => set({ isAddSheetOpen: true, selectedType: type ?? null }),
  closeAddSheet: () => set({ isAddSheetOpen: false, selectedType: null }),
  startEdit: (id) => set({ editingEntryId: id }),
  stopEdit: () => set({ editingEntryId: null }),
  togglePreview: () => set((state) => ({ previewOpen: !state.previewOpen })),
}))
