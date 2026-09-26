import { useMemo } from 'react'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import * as entriesRepository from '@/db/entries.repository'
import * as reportsRepository from '@/db/reports.repository'
import * as settingsRepository from '@/db/settings.repository'
import { generateDailyReport } from '@/services/reportGenerator'
import { renderHtml, renderWhatsAppText } from '@/services/renderers'
import { computeTowedTotal, computeTypeCounts, type TypeCount } from '@/utils/counters'
import { todayKey } from '@/utils/dates'
import type { ReportDocument } from '@/types/document'
import { DEFAULT_SETTINGS, type DailyEntry, type DailyReport, type Settings } from '@/types/schemas'

/**
 * Persisted-data store (CLAUDE.md architecture rules): the only place in the
 * app, besides src/db/ itself, allowed to call the repositories. Every
 * action persists through them first, then reloads state from the source of
 * truth (simple and correct — no local-only optimistic bookkeeping to drift).
 */

export interface ReportStoreDeps {
  reports: Pick<typeof reportsRepository, 'getOrCreateByDate' | 'updateHeader'>
  entries: Pick<typeof entriesRepository, 'listByReport' | 'create' | 'update' | 'remove' | 'duplicate'>
  settings: Pick<typeof settingsRepository, 'get' | 'update'>
}

const defaultDeps: ReportStoreDeps = {
  reports: reportsRepository,
  entries: entriesRepository,
  settings: settingsRepository,
}

export type ReportStoreStatus = 'idle' | 'loading' | 'ready' | 'error'

export type AddEntryInput = Omit<entriesRepository.CreateEntryInput, 'reportId'>

export interface ReportStoreState {
  dateKey: string | null
  report: DailyReport | null
  entries: DailyEntry[]
  settings: Settings
  status: ReportStoreStatus
  error?: string

  load: (dateKey?: string) => Promise<void>
  addEntry: (input: AddEntryInput) => Promise<void>
  updateEntry: (id: string, patch: entriesRepository.UpdateEntryPatch) => Promise<void>
  removeEntry: (id: string) => Promise<void>
  duplicateEntry: (id: string) => Promise<void>
  updateHeader: (text: string) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
}

/** Creates an isolated store bound to `deps` — tests inject fake-indexeddb repos or stubs. */
export function createReportStore(deps: ReportStoreDeps = defaultDeps) {
  return create<ReportStoreState>((set, get) => {
    async function reloadEntries(reportId: string): Promise<void> {
      const entries = await deps.entries.listByReport(reportId)
      set({ entries })
    }

    /** Runs a persisted mutation against the current report, then reloads entries; records failures. */
    async function withReport(mutate: (reportId: string) => Promise<void>): Promise<void> {
      const { report } = get()
      if (!report) return
      try {
        await mutate(report.id)
        await reloadEntries(report.id)
      } catch (error) {
        set({ status: 'error', error: (error as Error).message })
      }
    }

    return {
      dateKey: null,
      report: null,
      entries: [],
      settings: DEFAULT_SETTINGS,
      status: 'idle',
      error: undefined,

      load: async (dateKey = todayKey()) => {
        set({ status: 'loading', error: undefined })
        try {
          const [report, settings] = await Promise.all([
            deps.reports.getOrCreateByDate(dateKey),
            deps.settings.get(),
          ])
          const entries = await deps.entries.listByReport(report.id)
          set({ dateKey, report, entries, settings, status: 'ready' })
        } catch (error) {
          set({ status: 'error', error: (error as Error).message })
        }
      },

      addEntry: (input) => withReport((reportId) => deps.entries.create({ ...input, reportId }).then(() => {})),

      updateEntry: (id, patch) => withReport(() => deps.entries.update(id, patch).then(() => {})),

      removeEntry: (id) => withReport(() => deps.entries.remove(id)),

      duplicateEntry: (id) => withReport(() => deps.entries.duplicate(id).then(() => {})),

      updateHeader: async (text) => {
        const { report } = get()
        if (!report) return
        try {
          const updated = await deps.reports.updateHeader(report.id, text)
          set({ report: updated })
        } catch (error) {
          set({ status: 'error', error: (error as Error).message })
        }
      },

      updateSettings: async (patch) => {
        try {
          const settings = await deps.settings.update(patch)
          set({ settings })
        } catch (error) {
          set({ status: 'error', error: (error as Error).message })
        }
      },
    }
  })
}

/** Default app-wide instance — components use this; tests use `createReportStore()` for isolation. */
export const useReportStore = createReportStore()

// ---------------------------------------------------------------------
// Derived data — never stored, always recomputed from report/entries/settings.
// ---------------------------------------------------------------------

type DocumentSourceState = Pick<ReportStoreState, 'report' | 'entries' | 'settings'>

/** Pure — usable directly on `store.getState()` in tests, with no React involved. */
export function selectDocument(state: DocumentSourceState): ReportDocument | null {
  if (!state.report) return null
  return generateDailyReport(state.report, state.entries, state.settings)
}

export function selectPlainText(state: DocumentSourceState): string {
  const doc = selectDocument(state)
  return doc ? renderWhatsAppText(doc) : ''
}

export function selectHtml(state: DocumentSourceState): string {
  const doc = selectDocument(state)
  return doc ? renderHtml(doc) : ''
}

export interface Counters {
  total: number
  typeCounts: TypeCount[]
}

export function selectCounters(state: Pick<ReportStoreState, 'entries'>): Counters {
  return {
    total: computeTowedTotal(state.entries),
    typeCounts: computeTypeCounts(state.entries),
  }
}

/**
 * React hooks bound to the default store. Each one selects only the
 * primitive/array/object slices it needs via `useShallow` (so the selector's
 * *inputs* are reference-stable across renders when unchanged), then derives
 * through `useMemo` — the combination Zustand 5 needs to avoid the
 * "new object every render" infinite-update-loop pitfall.
 */
export function useReportDocument(): ReportDocument | null {
  const source = useReportStore(
    useShallow((state) => ({ report: state.report, entries: state.entries, settings: state.settings })),
  )
  return useMemo(() => selectDocument(source), [source])
}

export function usePlainText(): string {
  const doc = useReportDocument()
  return useMemo(() => (doc ? renderWhatsAppText(doc) : ''), [doc])
}

export function useHtml(): string {
  const doc = useReportDocument()
  return useMemo(() => (doc ? renderHtml(doc) : ''), [doc])
}

export function useCounters(): Counters {
  const entries = useReportStore((state) => state.entries)
  return useMemo(() => selectCounters({ entries }), [entries])
}
