import { DEFAULT_SETTINGS, settingsSchema, type Settings } from '@/types/schemas'
import { getDatabase, type SettingsRow } from './database'

/**
 * Settings repository (domain.md "Persistence rules"): a single row, keyed
 * by SETTINGS_ROW_ID. `get()` falls back to DEFAULT_SETTINGS when no row has
 * ever been written yet.
 */

const SETTINGS_ROW_ID = 'app'

function parseSettings(raw: unknown): Settings {
  const result = settingsSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Corrupt Settings row: ${result.error.message}`)
  }
  return result.data
}

export async function get(): Promise<Settings> {
  const db = getDatabase()
  const row = await db.settings.get(SETTINGS_ROW_ID)
  if (!row) return DEFAULT_SETTINGS

  // settingsSchema only knows theme/ticketedEmoji — the row's `id` key is
  // silently stripped by zod's default (non-strict) object parsing.
  return parseSettings(row)
}

export async function update(patch: Partial<Settings>): Promise<Settings> {
  const db = getDatabase()
  const current = await get()
  const merged = parseSettings({ ...current, ...patch })
  const row: SettingsRow = { ...merged, id: SETTINGS_ROW_ID }

  await db.settings.put(row)
  return merged
}
