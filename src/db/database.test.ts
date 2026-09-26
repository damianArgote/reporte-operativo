import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DATABASE_NAME, ReporteOperativoDatabase, getDatabase, resetDatabase } from './database'

describe('getDatabase', () => {
  afterEach(async () => {
    await resetDatabase()
  })

  it('returns the same singleton instance on repeated calls', () => {
    expect(getDatabase()).toBe(getDatabase())
  })

  it('opens a database named after DATABASE_NAME with the expected tables', async () => {
    const db = getDatabase()
    await db.open()
    expect(db.name).toBe(DATABASE_NAME)
    expect(db.tables.map((table) => table.name).sort()).toEqual(['entries', 'reports', 'settings'])
  })
})

describe('resetDatabase', () => {
  it('lets a fresh getDatabase() call start from an empty database', async () => {
    const db = getDatabase()
    await db.reports.add({ id: 'r1', date: '2026-09-26', header: '', createdAt: 0, updatedAt: 0 })
    expect(await db.reports.count()).toBe(1)

    await resetDatabase()

    const fresh = getDatabase()
    expect(fresh).not.toBe(db)
    expect(await fresh.reports.count()).toBe(0)
  })
})

describe('persistence across Dexie instances', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterEach(async () => {
    await resetDatabase()
  })

  it('survives closing the db and opening a brand new Dexie instance', async () => {
    const db = getDatabase()
    await db.reports.add({ id: 'r1', date: '2026-09-26', header: 'Turno noche', createdAt: 1, updatedAt: 1 })
    await db.entries.add({
      id: 'e1',
      reportId: 'r1',
      createdAt: 1,
      updatedAt: 1,
      time: '08:00',
      type: 'lp',
      towed: true,
      denounced: false,
      includeInReport: true,
      sortKey: 1,
      fields: { plate: 'AAA111', street: 'Calle', addressNumber: '100' },
    })
    db.close()

    const reopened = new ReporteOperativoDatabase()
    await reopened.open()

    const report = await reopened.reports.get('r1')
    const entry = await reopened.entries.get('e1')
    expect(report).toMatchObject({ date: '2026-09-26', header: 'Turno noche' })
    expect(entry).toMatchObject({ reportId: 'r1', type: 'lp' })

    reopened.close()
  })
})
