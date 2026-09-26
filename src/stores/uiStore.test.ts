import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initNavigationSync, useUiStore } from './uiStore'

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

  describe('navigate (view + location.hash sync)', () => {
    afterEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('starts on "today" for a plain URL with no hash', () => {
      expect(useUiStore.getState().view).toBe('today')
    })

    it('navigate("settings") switches the view and pushes the #/settings hash', () => {
      useUiStore.getState().navigate('settings')
      expect(useUiStore.getState().view).toBe('settings')
      expect(window.location.hash).toBe('#/settings')
    })

    it('navigate("today") switches the view back and clears the hash', () => {
      useUiStore.getState().navigate('settings')
      useUiStore.getState().navigate('today')
      expect(useUiStore.getState().view).toBe('today')
      expect(window.location.hash).toBe('')
    })

    it('syncViewFromLocation re-reads location.hash — what the browser/Android back button ends up triggering', () => {
      useUiStore.getState().navigate('settings')
      // Simulates the URL having already changed (e.g. the back button
      // popped the pushed entry) before the app reacts to it.
      window.location.hash = ''
      useUiStore.getState().syncViewFromLocation()
      expect(useUiStore.getState().view).toBe('today')
    })
  })

  describe('initNavigationSync', () => {
    afterEach(() => {
      window.history.replaceState(null, '', '/')
    })

    it('syncs the view whenever a hashchange event fires (browser/Android back or forward)', () => {
      const cleanup = initNavigationSync()
      try {
        useUiStore.getState().navigate('settings')

        window.location.hash = ''
        window.dispatchEvent(new Event('hashchange'))

        expect(useUiStore.getState().view).toBe('today')
      } finally {
        cleanup()
      }
    })

    it('returns a cleanup function that stops listening', () => {
      const cleanup = initNavigationSync()
      cleanup()

      useUiStore.getState().navigate('settings')
      window.location.hash = ''
      window.dispatchEvent(new Event('hashchange'))

      // No listener left to react — the store still reflects the last
      // explicit navigate() call, not the hash.
      expect(useUiStore.getState().view).toBe('settings')
    })
  })
})
