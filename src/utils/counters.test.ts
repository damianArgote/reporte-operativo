import { describe, expect, it } from 'vitest'
import type { DailyEntry } from '@/types/schemas'
import { computeTowedTotal, computeTypeCounts } from './counters'

function makeEntry(id: string, type: DailyEntry['type'], towed: boolean): DailyEntry {
  return {
    id,
    reportId: 'r1',
    createdAt: 0,
    updatedAt: 0,
    time: '10:00',
    type,
    towed,
    denounced: false,
    includeInReport: true,
    sortKey: 0,
    fields: {},
  }
}

describe('computeTowedTotal', () => {
  it('counts only towed entries', () => {
    const entries = [
      makeEntry('1', 'lp', true),
      makeEntry('2', 'ticketed', false),
      makeEntry('3', 'mi', true),
      makeEntry('4', 'free', false),
    ]
    expect(computeTowedTotal(entries)).toBe(2)
  })

  it('returns 0 for an empty report', () => {
    expect(computeTowedTotal([])).toBe(0)
  })
})

describe('computeTypeCounts', () => {
  it('counts towed entries per type in registry order, omitting zero counts', () => {
    const entries = [
      makeEntry('1', 'lp', true),
      makeEntry('2', 'lp', true),
      makeEntry('3', 'mi', true),
      makeEntry('4', 'construction', true),
      makeEntry('5', 'ticketed', false),
      makeEntry('6', 'construction', false), // untowed construction: not counted
    ]
    expect(computeTypeCounts(entries)).toEqual([
      { typeId: 'lp', countedLabel: 'LP', count: 2 },
      { typeId: 'mi', countedLabel: 'MI', count: 1 },
      { typeId: 'construction', countedLabel: 'Reservado de Obra', count: 1 },
    ])
  })

  it('omits a type entirely when its towed count is zero', () => {
    const entries = [makeEntry('1', 'lp', true)]
    const counts = computeTypeCounts(entries)
    expect(counts).toEqual([{ typeId: 'lp', countedLabel: 'LP', count: 1 }])
    expect(counts.find((c) => c.typeId === 'mi')).toBeUndefined()
  })

  it('returns an empty array when there are no towed entries', () => {
    expect(computeTypeCounts([makeEntry('1', 'ticketed', false)])).toEqual([])
  })

  it('always sums to the towed total', () => {
    const entries = [
      makeEntry('1', 'lp', true),
      makeEntry('2', 'lp', true),
      makeEntry('3', 'mi', true),
      makeEntry('4', 'construction', true),
      makeEntry('5', 'construction', true),
      makeEntry('6', 'ticketed', false),
    ]
    const total = computeTowedTotal(entries)
    const sum = computeTypeCounts(entries).reduce((acc, c) => acc + c.count, 0)
    expect(sum).toBe(total)
  })
})
