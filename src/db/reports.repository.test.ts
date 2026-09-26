import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './database'
import { getByDate, getOrCreateByDate, listDates, updateHeader } from './reports.repository'
import { create as createEntry } from './entries.repository'

describe('reports.repository', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterEach(async () => {
    await resetDatabase()
  })

  describe('getByDate', () => {
    it('returns undefined when no report exists for that date', async () => {
      expect(await getByDate('2026-09-26')).toBeUndefined()
    })

    it('returns the report once created', async () => {
      const created = await getOrCreateByDate('2026-09-26')
      expect(await getByDate('2026-09-26')).toEqual(created)
    })
  })

  describe('getOrCreateByDate', () => {
    it('creates a report with an empty header on first call', async () => {
      const report = await getOrCreateByDate('2026-09-26')
      expect(report).toMatchObject({ date: '2026-09-26', header: '' })
      expect(typeof report.id).toBe('string')
      expect(report.id.length).toBeGreaterThan(0)
      expect(report.createdAt).toEqual(report.updatedAt)
    })

    it('is idempotent: a second call for the same date returns the same report', async () => {
      const first = await getOrCreateByDate('2026-09-26')
      const second = await getOrCreateByDate('2026-09-26')
      expect(second).toEqual(first)
    })

    it('enforces one report per date (unique index)', async () => {
      const first = await getOrCreateByDate('2026-09-26')
      const second = await getOrCreateByDate('2026-09-26')
      expect(second.id).toBe(first.id)

      const other = await getOrCreateByDate('2026-09-27')
      expect(other.id).not.toBe(first.id)
    })
  })

  describe('updateHeader', () => {
    it('updates the header and bumps updatedAt', async () => {
      const report = await getOrCreateByDate('2026-09-26')
      const before = report.updatedAt

      const updated = await updateHeader(report.id, 'Turno noche\nMóvil 12')
      expect(updated.header).toBe('Turno noche\nMóvil 12')
      expect(updated.updatedAt).toBeGreaterThanOrEqual(before)
      expect(updated.date).toBe(report.date)

      expect(await getByDate('2026-09-26')).toEqual(updated)
    })

    it('throws for an unknown report id', async () => {
      await expect(updateHeader('missing', 'x')).rejects.toThrow()
    })
  })

  describe('listDates', () => {
    it('returns dates sorted descending with their entry counts', async () => {
      const r1 = await getOrCreateByDate('2026-09-24')
      const r2 = await getOrCreateByDate('2026-09-26')
      await getOrCreateByDate('2026-09-25')

      await createEntry({ reportId: r1.id, type: 'lp', fields: { plate: 'AAA111', street: 'Calle', addressNumber: '1' } })
      await createEntry({ reportId: r2.id, type: 'lp', fields: { plate: 'BBB222', street: 'Calle', addressNumber: '1' } })
      await createEntry({ reportId: r2.id, type: 'mi', fields: { plate: 'CCC333', street: 'Calle', addressNumber: '1' } })

      expect(await listDates()).toEqual([
        { date: '2026-09-26', entryCount: 2 },
        { date: '2026-09-25', entryCount: 0 },
        { date: '2026-09-24', entryCount: 1 },
      ])
    })
  })
})
