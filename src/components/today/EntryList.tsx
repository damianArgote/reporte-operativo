import { useMemo } from 'react'
import { computeTowedNumbering } from '@/services/reportGenerator'
import { useReportStore } from '@/stores/reportStore'
import { EntryRow } from './EntryRow'

export function EntryList() {
  const entries = useReportStore((state) => state.entries)
  const settings = useReportStore((state) => state.settings)
  const numbering = useMemo(() => computeTowedNumbering(entries), [entries])

  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No hay registros todavía.</p>
  }

  return (
    <ul className="flex flex-col" aria-label="Registros del día">
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} number={numbering.get(entry.id)} settings={settings} />
      ))}
    </ul>
  )
}
