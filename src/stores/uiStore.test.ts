import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from './uiStore'

const initialState = useUiStore.getInitialState()

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState(initialState, true)
  })

  it('starts closed, with no selection/edit/preview', () => {
    expect(useUiStore.getState()).toMatchObject({
      isAddSheetOpen: false,
      selectedType: null,
      denouncedPreset: false,
      editingEntryId: null,
      previewOpen: false,
    })
  })

  describe('openAddSheet / closeAddSheet', () => {
    it('opens with an optional preselected type', () => {
      useUiStore.getState().openAddSheet('lp')
      expect(useUiStore.getState()).toMatchObject({ isAddSheetOpen: true, selectedType: 'lp' })
    })

    it('opens with no type when none given', () => {
      useUiStore.getState().openAddSheet()
      expect(useUiStore.getState()).toMatchObject({ isAddSheetOpen: true, selectedType: null })
    })

    it('opens with the "Denuncia" preset (construction type, denounced defaulted true)', () => {
      useUiStore.getState().openAddSheet('construction', true)
      expect(useUiStore.getState()).toMatchObject({
        isAddSheetOpen: true,
        selectedType: 'construction',
        denouncedPreset: true,
      })
    })

    it('closes and clears the selected type and preset', () => {
      useUiStore.getState().openAddSheet('mi', true)
      useUiStore.getState().closeAddSheet()
      expect(useUiStore.getState()).toMatchObject({
        isAddSheetOpen: false,
        selectedType: null,
        denouncedPreset: false,
      })
    })
  })

  describe('startEdit / stopEdit', () => {
    it('tracks the entry id being edited', () => {
      useUiStore.getState().startEdit('entry-1')
      expect(useUiStore.getState().editingEntryId).toBe('entry-1')

      useUiStore.getState().stopEdit()
      expect(useUiStore.getState().editingEntryId).toBeNull()
    })
  })

  describe('togglePreview', () => {
    it('flips previewOpen each call', () => {
      expect(useUiStore.getState().previewOpen).toBe(false)
      useUiStore.getState().togglePreview()
      expect(useUiStore.getState().previewOpen).toBe(true)
      useUiStore.getState().togglePreview()
      expect(useUiStore.getState().previewOpen).toBe(false)
    })
  })
})
