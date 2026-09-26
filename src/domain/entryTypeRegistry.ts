import type { Span } from '@/types/document'
import type { DailyEntry, EntryFields, Settings } from '@/types/schemas'
import { ENTRY_TYPE_IDS, type EntryTypeId } from '@/types/entryTypeIds'

/**
 * Centralized entry-type registry (domain.md). This is the single place
 * that knows each type's label/icon/defaults/fields/formatting — adding a
 * new entry type should only ever require one new entry here (plus its id
 * in ENTRY_TYPE_IDS).
 */

export interface EntryFieldConfig {
  key: keyof EntryFields | 'rawText'
  label: string
  required: boolean
  /** Hint for later UI: which keyboard/input affordance to use. */
  inputMode?: 'text' | 'numeric'
}

export interface EntryTypeConfig {
  id: EntryTypeId
  /** Full label (e.g. used in lists/summaries). */
  label: string
  /** Short label used on the quick-add picker (e.g. "OBRA" for construction). */
  pickerLabel: string
  /** Lucide icon name — never import the icon component here. */
  icon: string
  towedByDefault: boolean
  /** Label used for this type's line in the summary block. */
  countedLabel: string
  fields: EntryFieldConfig[]
  /**
   * Renders this entry's line content, with NO number prefix — the
   * generator prepends "N. " for towed entries. `denounced`'s
   * " Denuncia." suffix is also the generator's responsibility (it applies
   * uniformly, regardless of type).
   */
  formatter: (entry: DailyEntry, settings: Settings) => Span[]
}

function textSpan(text: string): Span[] {
  return [{ kind: 'text', text }]
}

/**
 * Appends an optional trailing `{observation}` after the type's base
 * rendered line, when present. report-format.md spells this rule out only
 * for `lp`'s rendered-line example, but lists `observation` as an optional
 * field for `lp`, `mi`, `construction` and `ticketed` alike — applied here
 * uniformly for all of them (see T2 hand-off notes: spec gap).
 */
function withObservation(base: string, fields: EntryFields): string {
  return fields.observation ? `${base} ${fields.observation}` : base
}

export const ENTRY_TYPE_REGISTRY: Record<EntryTypeId, EntryTypeConfig> = {
  lp: {
    id: 'lp',
    label: 'LP',
    pickerLabel: 'LP',
    icon: 'Car',
    towedByDefault: true,
    countedLabel: 'LP',
    fields: [
      { key: 'plate', label: 'Patente', required: true, inputMode: 'text' },
      { key: 'street', label: 'Calle', required: true, inputMode: 'text' },
      { key: 'addressNumber', label: 'Altura', required: true, inputMode: 'numeric' },
      { key: 'observation', label: 'Observación', required: false, inputMode: 'text' },
    ],
    formatter: (entry) => {
      const { plate = '', street = '', addressNumber = '' } = entry.fields
      return textSpan(withObservation(`${plate} un LP en ${street} ${addressNumber}.`, entry.fields))
    },
  },

  mi: {
    id: 'mi',
    label: 'MI',
    pickerLabel: 'MI',
    icon: 'CarFront',
    towedByDefault: true,
    countedLabel: 'MI',
    fields: [
      { key: 'plate', label: 'Patente', required: true, inputMode: 'text' },
      { key: 'street', label: 'Calle', required: true, inputMode: 'text' },
      { key: 'addressNumber', label: 'Altura', required: true, inputMode: 'numeric' },
      { key: 'observation', label: 'Observación', required: false, inputMode: 'text' },
    ],
    formatter: (entry) => {
      const { plate = '', street = '', addressNumber = '' } = entry.fields
      return textSpan(withObservation(`${plate} un MI en ${street} ${addressNumber}.`, entry.fields))
    },
  },

  construction: {
    id: 'construction',
    label: 'Reservado de Obra',
    pickerLabel: 'OBRA',
    icon: 'Construction',
    towedByDefault: true,
    countedLabel: 'Reservado de Obra',
    fields: [
      { key: 'plate', label: 'Patente', required: true, inputMode: 'text' },
      { key: 'vehicle', label: 'Vehículo', required: true, inputMode: 'text' },
      { key: 'street', label: 'Calle', required: true, inputMode: 'text' },
      { key: 'addressNumber', label: 'Altura', required: true, inputMode: 'numeric' },
      { key: 'reason', label: 'Motivo', required: true, inputMode: 'text' },
      { key: 'observation', label: 'Observación', required: false, inputMode: 'text' },
    ],
    formatter: (entry) => {
      const { plate = '', vehicle = '', street = '', addressNumber = '', reason = '' } = entry.fields
      return textSpan(
        withObservation(`${plate} ${vehicle} ${street} ${addressNumber} ${reason}.`, entry.fields),
      )
    },
  },

  ticketed: {
    id: 'ticketed',
    label: 'Infraccionado',
    pickerLabel: 'Infraccionado',
    icon: 'Ticket',
    towedByDefault: false,
    countedLabel: 'Infraccionado',
    fields: [
      { key: 'plate', label: 'Patente', required: true, inputMode: 'text' },
      { key: 'identifier', label: 'Identificador', required: true, inputMode: 'text' },
      { key: 'observation', label: 'Observación', required: false, inputMode: 'text' },
    ],
    formatter: (entry, settings) => {
      const { plate = '', identifier = '' } = entry.fields
      return textSpan(
        withObservation(`${plate} un ${identifier}/${settings.ticketedEmoji} Infraccionado.`, entry.fields),
      )
    },
  },

  free: {
    id: 'free',
    label: 'Novedad',
    pickerLabel: 'Novedad',
    icon: 'MessageSquare',
    towedByDefault: false,
    countedLabel: 'Novedad',
    fields: [{ key: 'rawText', label: 'Texto', required: true, inputMode: 'text' }],
    formatter: (entry) => [{ kind: 'text', text: entry.rawText ?? '', verbatim: true }],
  },
}

/** Registry order — drives the summary block's per-type counter order. */
export const ENTRY_TYPE_ORDER: readonly EntryTypeId[] = ENTRY_TYPE_IDS

export function getEntryTypeConfig(id: EntryTypeId): EntryTypeConfig {
  return ENTRY_TYPE_REGISTRY[id]
}
