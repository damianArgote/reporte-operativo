import type { DailyEntry, DailyReport, Settings } from '@/types/schemas'

/**
 * Golden fixture `golden-2026-09-26` — docs/specs/report-format.md.
 * Source: real screenshot, report date 26/09/2026.
 *
 * Entries are transcribed exactly as the spec's entries table (already
 * normalized, as they'd be in storage: plates uppercase, whitespace
 * collapsed). `sortKey` defaults to `createdAt` (monotonically increasing
 * in time order here), per domain.md's "sortKey ... default derived from
 * time+createdAt".
 */

export const goldenReport: DailyReport = {
  id: 'report-2026-09-26',
  date: '2026-09-26',
  header:
    'G. 28. Ruesga, Bazan. 19hs descanso.\nLuis María Campos hoy.\nSegundo turno Zabala 1700 al 1900.',
  createdAt: 1_758_800_000_000,
  updatedAt: 1_758_800_000_000,
}

export const goldenSettings: Settings = {
  theme: 'system',
  ticketedEmoji: '📱',
  background: 'neutral',
  // Non-empty on purpose: the golden test below asserts the rendered text
  // is byte-for-byte unchanged, proving userName never leaks into it
  // (domain.md Decisions #17 — app-only, never in the report).
  userName: 'Damian',
  customBackgrounds: [],
}

function entry(overrides: Omit<DailyEntry, 'reportId' | 'denounced' | 'sortKey'> & {
  denounced?: boolean
  createdAt: number
}): DailyEntry {
  return {
    reportId: goldenReport.id,
    denounced: false,
    sortKey: overrides.createdAt,
    ...overrides,
  }
}

export const goldenEntries: DailyEntry[] = [
  entry({
    id: 'entry-1605-lp',
    createdAt: 1,
    updatedAt: 1,
    time: '16:05',
    type: 'lp',
    towed: true,
    includeInReport: true,
    fields: { plate: 'OHM949', street: 'Av Luis María Campos', addressNumber: '1270' },
  }),
  entry({
    id: 'entry-1619-free',
    createdAt: 2,
    updatedAt: 2,
    time: '16:19',
    type: 'free',
    towed: false,
    includeInReport: false,
    fields: {},
    rawText:
      'Chicos les paso una patente para respetar\nKYZ392 en Paraguay 2570 . *No remover* por favor gracias.',
  }),
  entry({
    id: 'entry-1633-ticketed',
    createdAt: 3,
    updatedAt: 3,
    time: '16:33',
    type: 'ticketed',
    towed: false,
    includeInReport: true,
    fields: { plate: 'MEY521', identifier: '6490' },
  }),
  entry({
    id: 'entry-1653-lp',
    createdAt: 4,
    updatedAt: 4,
    time: '16:53',
    type: 'lp',
    towed: true,
    includeInReport: true,
    fields: { plate: 'HHR132', street: 'Av Luis María Campos', addressNumber: '1307' },
  }),
  entry({
    id: 'entry-1709-construction-pretow',
    createdAt: 5,
    updatedAt: 5,
    time: '17:09',
    type: 'construction',
    towed: false,
    includeInReport: false,
    fields: {
      plate: 'KMB728',
      vehicle: 'Volkswagen',
      street: 'TENIENTE BENJAMIN MATIENZO',
      addressNumber: '1745',
      reason: 'Obra en construccion',
    },
  }),
  entry({
    id: 'entry-1718-free',
    createdAt: 6,
    updatedAt: 6,
    time: '17:18',
    type: 'free',
    towed: false,
    includeInReport: false,
    fields: {},
    rawText: 'Luis María Campos al 1300 NO HAY CARTELERÍA.',
  }),
  entry({
    id: 'entry-1744-construction-towed',
    createdAt: 7,
    updatedAt: 7,
    time: '17:44',
    type: 'construction',
    towed: true,
    denounced: true,
    includeInReport: true,
    fields: {
      plate: 'KMB728',
      vehicle: 'Volkswagen',
      street: 'TENIENTE BENJAMIN MATIENZO',
      addressNumber: '1745',
      reason: 'Obra en construccion',
    },
  }),
  entry({
    id: 'entry-1831-lp',
    createdAt: 8,
    updatedAt: 8,
    time: '18:31',
    type: 'lp',
    towed: true,
    includeInReport: true,
    fields: { plate: 'AB921VH', street: 'Av Luis María Campos', addressNumber: '1525' },
  }),
  entry({
    id: 'entry-2030-lp',
    createdAt: 9,
    updatedAt: 9,
    time: '20:30',
    type: 'lp',
    towed: true,
    includeInReport: true,
    fields: { plate: 'AF020JK', street: 'Av Luis María Campos', addressNumber: '805' },
  }),
  entry({
    id: 'entry-2122-mi',
    createdAt: 10,
    updatedAt: 10,
    time: '21:22',
    type: 'mi',
    towed: true,
    includeInReport: true,
    fields: { plate: 'AF293QB', street: 'Larrea', addressNumber: '1168' },
  }),
]

// Copied verbatim from docs/specs/report-format.md — do not hand-edit
// without re-checking the spec byte-for-byte. No trailing newline.
export const GOLDEN_EXPECTED_WHATSAPP_TEXT = [
  '*26/09/2026*',
  '',
  'G. 28. Ruesga, Bazan. 19hs descanso.',
  'Luis María Campos hoy.',
  'Segundo turno Zabala 1700 al 1900.',
  '',
  '1. OHM949 un LP en Av Luis María Campos 1270.',
  '',
  '2. HHR132 un LP en Av Luis María Campos 1307.',
  '',
  '3. KMB728 Volkswagen TENIENTE BENJAMIN MATIENZO 1745 Obra en construccion. Denuncia.',
  '',
  '4. AB921VH un LP en Av Luis María Campos 1525.',
  '',
  '5. AF020JK un LP en Av Luis María Campos 805.',
  '',
  '6. AF293QB un MI en Larrea 1168.',
  '',
  '*Hoy 6 a playa:*',
  'LP: 4',
  'MI: 1',
  'Reservado de Obra: 1',
  '',
  'MEY521 un 6490/📱 Infraccionado.',
].join('\n')
