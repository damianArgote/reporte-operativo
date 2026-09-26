import Dexie, { type EntityTable } from 'dexie'
import type { DailyEntry, DailyReport, Settings } from '@/types/schemas'

/**
 * Dexie schema (domain.md "Persistence rules"). Components never import this
 * module directly — only the repositories in this folder, and the stores
 * that wrap them, may touch it.
 */

export const DATABASE_NAME = 'reporte-operativo'

/** Settings is a single row, keyed by SETTINGS_ROW_ID — see settings.repository.ts. */
export type SettingsRow = Settings & { id: string }

export class ReporteOperativoDatabase extends Dexie {
  reports!: EntityTable<DailyReport, 'id'>
  entries!: EntityTable<DailyEntry, 'id'>
  settings!: EntityTable<SettingsRow, 'id'>

  constructor(name: string = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      // `id` is app-assigned (crypto.randomUUID()), never auto-incremented.
      reports: 'id, &date',
      entries: 'id, reportId, [reportId+time]',
      settings: 'id',
    })
  }
}

let instance: ReporteOperativoDatabase | null = null

/** Shared singleton — repositories call this instead of constructing Dexie themselves. */
export function getDatabase(): ReporteOperativoDatabase {
  if (!instance) {
    instance = new ReporteOperativoDatabase()
  }
  return instance
}

/**
 * Test-only: closes and deletes the current singleton's underlying database
 * so the next `getDatabase()` call starts from a clean IndexedDB. Safe to
 * call even if nothing was ever opened.
 */
export async function resetDatabase(): Promise<void> {
  if (instance) {
    instance.close()
    await instance.delete()
    instance = null
  } else {
    // Nothing cached, but a previous test run may have left the named
    // database behind — drop it directly so tests never leak into each other.
    await new ReporteOperativoDatabase().delete()
  }
}
