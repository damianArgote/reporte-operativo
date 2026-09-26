import { dailyReportSchema, type DailyReport } from '@/types/schemas'
import { getDatabase } from './database'

/**
 * Reports repository (domain.md "Persistence rules"). Validates with
 * dailyReportSchema on every write and every read; a corrupt row throws
 * rather than being silently accepted.
 */

function parseReport(raw: unknown): DailyReport {
  const result = dailyReportSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Corrupt DailyReport row: ${result.error.message}`)
  }
  return result.data
}

export async function getByDate(date: string): Promise<DailyReport | undefined> {
  const db = getDatabase()
  const row = await db.reports.where('date').equals(date).first()
  return row ? parseReport(row) : undefined
}

/** Creates the report with an empty header if none exists yet for `date`. Idempotent. */
export async function getOrCreateByDate(date: string): Promise<DailyReport> {
  const existing = await getByDate(date)
  if (existing) return existing

  const db = getDatabase()
  const now = Date.now()
  const report = parseReport({
    id: crypto.randomUUID(),
    date,
    header: '',
    createdAt: now,
    updatedAt: now,
  })

  try {
    await db.reports.add(report)
    return report
  } catch {
    // Unique-index race: another caller created this date's report first.
    const raced = await getByDate(date)
    if (raced) return raced
    throw new Error(`Failed to create report for date: ${date}`)
  }
}

export async function updateHeader(reportId: string, header: string): Promise<DailyReport> {
  const db = getDatabase()
  const existing = await db.reports.get(reportId)
  if (!existing) {
    throw new Error(`Report not found: ${reportId}`)
  }
  const current = parseReport(existing)
  const updated = parseReport({ ...current, header, updatedAt: Date.now() })

  await db.reports.put(updated)
  return updated
}

export interface DateSummary {
  date: string
  entryCount: number
}

/** Minimal listing for later history/calendar views — dates sorted newest first. */
export async function listDates(): Promise<DateSummary[]> {
  const db = getDatabase()
  const reports = (await db.reports.toArray()).map(parseReport)

  const summaries = await Promise.all(
    reports.map(async (report) => ({
      date: report.date,
      entryCount: await db.entries.where('reportId').equals(report.id).count(),
    })),
  )

  return summaries.sort((a, b) => b.date.localeCompare(a.date))
}
