import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/types/schemas'
import { resetDatabase } from './database'
import { get, update } from './settings.repository'

describe('settings.repository', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterEach(async () => {
    await resetDatabase()
  })

  describe('get', () => {
    it('returns DEFAULT_SETTINGS when no row exists', async () => {
      expect(await get()).toEqual(DEFAULT_SETTINGS)
    })

    it('returns the persisted settings once updated', async () => {
      await update({ theme: 'dark' })
      expect(await get()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
    })
  })

  describe('update', () => {
    it('merges a partial patch onto the current settings', async () => {
      await update({ ticketedEmoji: '🅿️' })
      const updated = await update({ theme: 'light' })
      expect(updated).toEqual({ theme: 'light', ticketedEmoji: '🅿️' })
    })

    it('persists across calls (single row keyed "app")', async () => {
      await update({ theme: 'dark' })
      await update({ theme: 'system' })
      expect(await get()).toEqual({ ...DEFAULT_SETTINGS, theme: 'system' })
    })
  })
})
