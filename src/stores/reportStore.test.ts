import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from '@/db/database'
import * as entriesRepository from '@/db/entries.repository'
import * as reportsRepository from '@/db/reports.repository'
import * as settingsRepository from '@/db/settings.repository'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { todayKey } from '@/utils/dates'
import {
  createReportStore,
  selectCounters,
  selectDocument,
  selectHtml,
  selectPlainText,
  type ReportStoreDeps,
} from './reportStore'

function realDeps(): ReportStoreDeps {
  return { reports: reportsRepository, entries: entriesRepository, settings: settingsRepository }
}

function lpInput(plate: string, time: string) {
  return { type: 'lp' as const, time, fields: { plate, street: 'Calle', addressNumber: '100' } }
}

describe('reportStore', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterEach(async () => {
    await resetDatabase()
  })

  describe('load', () => {
    it('defaults to today, creates/loads the report, its entries and settings', async () => {
      const store = createReportStore(realDeps())
      await store.getState().load()

      const state = store.getState()
      expect(state.status).toBe('ready')
      expect(state.dateKey).toBe(todayKey())
      expect(state.report).toMatchObject({ date: todayKey(), header: '' })
      expect(state.entries).toEqual([])
      expect(state.settings).toEqual(DEFAULT_SETTINGS)
    })

    it('sets status "error" and records the message when a repository call fails', async () => {
      const store = createReportStore({
        ...realDeps(),
        reports: { ...realDeps().reports, getOrCreateByDate: () => Promise.reject(new Error('db down')) },
      })

      await store.getState().load('2026-09-26')

      expect(store.getState().status).toBe('error')
      expect(store.getState().error).toBe('db down')
    })
  })

  describe('addEntry / updateEntry / removeEntry / duplicateEntry', () => {
    it('persist through repositories and reload entries + derived counters/text immediately', async () => {
      const store = createReportStore(realDeps())
      await store.getState().load('2026-09-26')

      await store.getState().addEntry(lpInput('AAA111', '08:00'))
      await store.getState().addEntry(lpInput('BBB222', '09:00'))
      await store.getState().addEntry(lpInput('CCC333', '10:00'))

      const afterAdds = store.getState()
      expect(afterAdds.entries).toHaveLength(3)
      expect(selectCounters(afterAdds)).toEqual({
        total: 3,
        typeCounts: [{ typeId: 'lp', countedLabel: 'LP', count: 3 }],
      })
      const plainTextAfterAdds = selectPlainText(afterAdds)
      expect(plainTextAfterAdds).toContain('1. AAA111 un LP en Calle 100.')
      expect(plainTextAfterAdds).toContain('2. BBB222 un LP en Calle 100.')
      expect(plainTextAfterAdds).toContain('3. CCC333 un LP en Calle 100.')

      // Delete the middle entry: remaining two must be renumbered 1./2., not 1./3.
      const middle = afterAdds.entries.find((e) => e.fields.plate === 'BBB222')!
      await store.getState().removeEntry(middle.id)

      const afterRemove = store.getState()
      const plainTextAfterRemove = selectPlainText(afterRemove)
      expect(plainTextAfterRemove).toContain('1. AAA111 un LP en Calle 100.')
      expect(plainTextAfterRemove).toContain('2. CCC333 un LP en Calle 100.')
      expect(plainTextAfterRemove).not.toContain('BBB222')
      expect(plainTextAfterRemove).not.toContain('3.')
      expect(selectCounters(afterRemove).total).toBe(2)

      // Update: toggle towed off, total drops.
      const first = afterRemove.entries.find((e) => e.fields.plate === 'AAA111')!
      await store.getState().updateEntry(first.id, { towed: false })
      expect(selectCounters(store.getState()).total).toBe(1)

      // Duplicate: entry count goes back up.
      const remaining = store.getState().entries.find((e) => e.fields.plate === 'CCC333')!
      await store.getState().duplicateEntry(remaining.id)
      expect(store.getState().entries).toHaveLength(3)
    })
  })

  describe('restoreEntry', () => {
    it('re-adds a removed entry with its exact original data (undo)', async () => {
      const store = createReportStore(realDeps())
      await store.getState().load('2026-09-26')

      await store.getState().addEntry(lpInput('AAA111', '08:00'))
      const removed = store.getState().entries[0]!
      await store.getState().removeEntry(removed.id)
      expect(store.getState().entries).toEqual([])

      await store.getState().restoreEntry(removed)

      expect(store.getState().entries).toEqual([removed])
    })
  })

  describe('updateHeader', () => {
    it('updates the report header, reflected in the derived text', async () => {
      const store = createReportStore(realDeps())
      await store.getState().load('2026-09-26')

      await store.getState().updateHeader('Turno noche')

      expect(store.getState().report?.header).toBe('Turno noche')
      expect(selectPlainText(store.getState())).toContain('Turno noche')
    })
  })

  describe('updateSettings', () => {
    it('updates settings, reflected in the derived text (ticketed emoji)', async () => {
      const store = createReportStore(realDeps())
      await store.getState().load('2026-09-26')
      await store.getState().addEntry({ type: 'ticketed', fields: { plate: 'DDD444', identifier: 'X1' } })

      await store.getState().updateSettings({ ticketedEmoji: '🅿️' })

      expect(store.getState().settings.ticketedEmoji).toBe('🅿️')
      expect(selectPlainText(store.getState())).toContain('🅿️')
    })
  })

  describe('selectDocument / selectHtml', () => {
    it('return null/"" before a report is loaded, and a real document/html once ready', async () => {
      const store = createReportStore(realDeps())
      expect(selectDocument(store.getState())).toBeNull()
      expect(selectHtml(store.getState())).toBe('')

      await store.getState().load('2026-09-26')
      expect(selectDocument(store.getState())).not.toBeNull()
      expect(selectHtml(store.getState())).toContain('26/09/2026')
    })
  })
})
