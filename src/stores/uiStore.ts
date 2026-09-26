import { create } from 'zustand'
import type { EntryTypeId } from '@/types/entryTypeIds'

/**
 * UI-only state (CLAUDE.md architecture rules): dialogs/selection/drafts,
 * kept separate from persisted data (reportStore). Theme is NOT here — it
 * lives in Settings and is handled via reportStore/settings.repository (T6).
 */

/**
 * In-app screen. A typed union (not a boolean) so M2's history/search views
 * extend it with one more member instead of a router dependency.
 */
export type View = 'today' | 'settings'

const SETTINGS_HASH = '#/settings'

function viewFromHash(hash: string): View {
  return hash === SETTINGS_HASH ? 'settings' : 'today'
}

function hashForView(view: View): string {
  return view === 'settings' ? SETTINGS_HASH : ''
}

function currentHash(): string {
  return typeof window === 'undefined' ? '' : window.location.hash
}

export interface UiStoreState {
  isAddSheetOpen: boolean
  selectedType: EntryTypeId | null
  /** True when the add sheet was opened via the "Denuncia" quick tile — the entry form defaults `denounced` to true. */
  denouncedPreset: boolean
  editingEntryId: string | null
  previewOpen: boolean
  view: View

  openAddSheet: (type?: EntryTypeId, denouncedPreset?: boolean) => void
  closeAddSheet: () => void
  startEdit: (id: string) => void
  stopEdit: () => void
  togglePreview: () => void
  /** Switches the view and pushes a matching `location.hash` entry, so browser/Android back works. */
  navigate: (view: View) => void
  /** Re-reads `view` from the current `location.hash` — used by `initNavigationSync`'s hashchange/popstate listener. */
  syncViewFromLocation: () => void
}

export const useUiStore = create<UiStoreState>((set) => ({
  isAddSheetOpen: false,
  selectedType: null,
  denouncedPreset: false,
  editingEntryId: null,
  previewOpen: false,
  view: viewFromHash(currentHash()),

  openAddSheet: (type, denouncedPreset) =>
    set({ isAddSheetOpen: true, selectedType: type ?? null, denouncedPreset: denouncedPreset ?? false }),
  closeAddSheet: () => set({ isAddSheetOpen: false, selectedType: null, denouncedPreset: false }),
  startEdit: (id) => set({ editingEntryId: id }),
  stopEdit: () => set({ editingEntryId: null }),
  togglePreview: () => set((state) => ({ previewOpen: !state.previewOpen })),

  navigate: (view) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.pathname}${window.location.search}${hashForView(view)}`
      window.history.pushState({ view }, '', url)
    }
    set({ view })
  },
  syncViewFromLocation: () => set({ view: viewFromHash(currentHash()) }),
}))

/**
 * Wires the store's `view` to the browser/Android back-forward stack:
 * `navigate()` pushes one history entry per view change; this listens for
 * the resulting hashchange/popstate (back/forward button) and re-syncs
 * `view` from `location.hash`. Call once from the app root (e.g. inside a
 * `useEffect`) — it returns a cleanup function for the effect's teardown.
 */
export function initNavigationSync(): () => void {
  if (typeof window === 'undefined') return () => {}
  const sync = () => useUiStore.getState().syncViewFromLocation()
  window.addEventListener('hashchange', sync)
  window.addEventListener('popstate', sync)
  return () => {
    window.removeEventListener('hashchange', sync)
    window.removeEventListener('popstate', sync)
  }
}
