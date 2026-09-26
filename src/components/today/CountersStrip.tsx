import { useCounters } from '@/stores/reportStore'

/**
 * "Hoy N a playa" + per-type counts (domain.md invariants 2-3). Fully
 * hidden when N=0 — nothing towed yet means nothing to summarize (mirrors
 * the report generator's own rule for the summary block).
 */
export function CountersStrip() {
  const counters = useCounters()

  if (counters.total === 0) return null

  const perType = counters.typeCounts.map((tc) => `${tc.countedLabel} ${tc.count}`).join(' · ')

  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Hoy {counters.total} a playa</span>
      {perType && <span> · {perType}</span>}
    </p>
  )
}
