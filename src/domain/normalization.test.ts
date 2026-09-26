import { describe, expect, it } from 'vitest'
import { collapseWhitespace, normalizeEntryFields, normalizePlate } from './normalization'

describe('normalizePlate', () => {
  it('uppercases and trims', () => {
    expect(normalizePlate('  ohm949  ')).toBe('OHM949')
  })

  it('uppercases mixed-case plates with letters and digits', () => {
    expect(normalizePlate('ab921vh')).toBe('AB921VH')
  })
})

describe('collapseWhitespace', () => {
  it('trims leading/trailing whitespace', () => {
    expect(collapseWhitespace('  Av Luis María Campos  ')).toBe('Av Luis María Campos')
  })

  it('collapses internal runs of whitespace to a single space', () => {
    expect(collapseWhitespace('Av   Luis    María   Campos')).toBe('Av Luis María Campos')
  })

  it('collapses embedded newlines/tabs into a single space', () => {
    expect(collapseWhitespace('Obra en\nconstruccion\t ')).toBe('Obra en construccion')
  })
})

describe('normalizeEntryFields', () => {
  it('uppercases+trims plate and collapses whitespace in other fields', () => {
    const result = normalizeEntryFields({
      plate: '  hhr132 ',
      street: '  Av   Luis María   Campos ',
      addressNumber: ' 1307 ',
      observation: 'con  doble   espacio',
    })
    expect(result).toEqual({
      plate: 'HHR132',
      street: 'Av Luis María Campos',
      addressNumber: '1307',
      observation: 'con doble espacio',
    })
  })

  it('leaves absent fields absent', () => {
    expect(normalizeEntryFields({ plate: 'abc123' })).toEqual({ plate: 'ABC123' })
  })

  it('normalizes every known structured field, not just plate', () => {
    const result = normalizeEntryFields({
      vehicle: ' Volkswagen  Gol ',
      identifier: ' 6490 ',
      reason: '  Obra   en construccion ',
    })
    expect(result).toEqual({
      vehicle: 'Volkswagen Gol',
      identifier: '6490',
      reason: 'Obra en construccion',
    })
  })

  it('returns an empty object unchanged', () => {
    expect(normalizeEntryFields({})).toEqual({})
  })
})
