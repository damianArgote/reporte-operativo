import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './database'
import { getOrCreateByDate } from './reports.repository'
import { create, duplicate, listByReport, remove, update } from './entries.repository'

describe('entries.repository', () => {
  let reportId: string

  beforeEach(async () => {
    await resetDatabase()
    reportId = (await getOrCreateByDate('2026-09-26')).id
  })

  afterEach(async () => {
    await resetDatabase()
  })

  describe('create', () => {
    it('normalizes fields, and applies registry/report defaults when not given', async () => {
      const entry = await create({
        reportId,
        type: 'lp',
        fields: { plate: '  aaa111 ', street: '  Av   Siempre Viva ', addressNumber: ' 742 ' },
      })

      expect(entry.fields).toEqual({ plate: 'AAA111', street: 'Av Siempre Viva', addressNumber: '742' })
      expect(entry.towed).toBe(true) // lp.towedByDefault
      expect(entry.denounced).toBe(false)
      expect(entry.includeInReport).toBe(true)
      expect(typeof entry.time).toBe('string')
      expect(entry.time).toMatch(/^\d{2}:\d{2}$/)
      expect(entry.createdAt).toEqual(entry.updatedAt)
      expect(entry.reportId).toBe(reportId)
    })

    it('honors an explicit towed/time/includeInReport override', async () => {
      const entry = await create({
        reportId,
        type: 'ticketed', // towedByDefault: false
        towed: true,
        time: '14:30',
        includeInReport: false,
        fields: { plate: 'BBB222', identifier: 'X1' },
      })

      expect(entry.towed).toBe(true)
      expect(entry.time).toBe('14:30')
      expect(entry.includeInReport).toBe(false)
    })

    it('persists the entry so listByReport finds it', async () => {
      const entry = await create({ reportId, type: 'free', rawText: 'Corte de luz en la cuadra' })
      const listed = await listByReport(reportId)
      expect(listed).toEqual([entry])
    })
  })

  describe('listByReport', () => {
    it('returns entries ordered by time then sortKey', async () => {
      const late = await create({ reportId, type: 'free', rawText: 'b', time: '20:00' })
      const early = await create({ reportId, type: 'free', rawText: 'a', time: '08:00' })

      expect(await listByReport(reportId)).toEqual([early, late])
    })
  })

  describe('update', () => {
    it('re-normalizes patched fields and bumps updatedAt', async () => {
      const entry = await create({
        reportId,
        type: 'lp',
        fields: { plate: 'AAA111', street: 'Calle', addressNumber: '100' },
      })

      const updated = await update(entry.id, { fields: { ...entry.fields, plate: '  ccc333 ' } })

      expect(updated.fields.plate).toBe('CCC333')
      expect(updated.updatedAt).toBeGreaterThanOrEqual(entry.updatedAt)
      expect(updated.createdAt).toBe(entry.createdAt)
    })

    it('throws for an unknown entry id', async () => {
      await expect(update('missing', { towed: false })).rejects.toThrow()
    })
  })

  describe('remove', () => {
    it('deletes the entry', async () => {
      const entry = await create({ reportId, type: 'free', rawText: 'x' })
      await remove(entry.id)
      expect(await listByReport(reportId)).toEqual([])
    })
  })

  describe('duplicate', () => {
    it('creates a copy with a new id/timestamps placed right after the original', async () => {
      const original = await create({
        reportId,
        type: 'lp',
        time: '09:00',
        fields: { plate: 'AAA111', street: 'Calle', addressNumber: '100' },
      })
      const other = await create({
        reportId,
        type: 'lp',
        time: '09:00',
        sortKey: original.sortKey + 100,
        fields: { plate: 'ZZZ999', street: 'Calle', addressNumber: '200' },
      })

      const copy = await duplicate(original.id)

      expect(copy.id).not.toBe(original.id)
      expect(copy.fields).toEqual(original.fields)
      expect(copy.time).toBe(original.time)

      const listed = await listByReport(reportId)
      expect(listed.map((e) => e.id)).toEqual([original.id, copy.id, other.id])
    })

    it('throws for an unknown entry id', async () => {
      await expect(duplicate('missing')).rejects.toThrow()
    })
  })
})
