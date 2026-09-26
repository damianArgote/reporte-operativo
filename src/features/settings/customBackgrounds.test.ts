import { describe, expect, it } from 'vitest'
import type { CustomBackground } from '@/types/schemas'
import {
  MAX_CUSTOM_BACKGROUNDS,
  createCustomBackgroundId,
  findCustomBackground,
  isCustomBackgroundId,
  isPresetBackgroundId,
  resolveCustomBackgroundApplication,
  resolveEffectiveBackgroundHex,
} from './customBackgrounds'

const CUSTOM: CustomBackground = {
  id: 'custom-11111111-1111-4111-8111-111111111111',
  light: '#fafafa',
  dark: '#222222',
}

describe('createCustomBackgroundId', () => {
  it('produces a "custom-<uuid>" id', () => {
    const id = createCustomBackgroundId()
    expect(id).toMatch(/^custom-[0-9a-f-]{36}$/)
  })

  it('produces a unique id on every call', () => {
    expect(createCustomBackgroundId()).not.toBe(createCustomBackgroundId())
  })
})

describe('isPresetBackgroundId / isCustomBackgroundId', () => {
  it('recognizes preset ids', () => {
    expect(isPresetBackgroundId('arena')).toBe(true)
    expect(isPresetBackgroundId('custom-11111111-1111-4111-8111-111111111111')).toBe(false)
  })

  it('recognizes custom ids by the "custom-" prefix', () => {
    expect(isCustomBackgroundId('custom-11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isCustomBackgroundId('arena')).toBe(false)
  })
})

describe('findCustomBackground', () => {
  it('finds a custom background by id', () => {
    expect(findCustomBackground(CUSTOM.id, [CUSTOM])?.id).toBe(CUSTOM.id)
  })

  it('returns undefined for an unknown id', () => {
    expect(findCustomBackground('custom-does-not-exist', [CUSTOM])).toBeUndefined()
  })
})

describe('resolveCustomBackgroundApplication', () => {
  it('keeps the default foreground/muted-foreground (no override) when the custom bg already reads well', () => {
    const result = resolveCustomBackgroundApplication('#fafafa', 'light')
    expect(result.backgroundHex).toBe('#fafafa')
    expect(result.foregroundHex).toBeNull()
    expect(result.mutedForegroundHex).toBeNull()
  })

  it('overrides foreground + muted-foreground when the custom bg does not read well against the theme default', () => {
    const result = resolveCustomBackgroundApplication('#222222', 'light')
    expect(result.backgroundHex).toBe('#222222')
    expect(result.foregroundHex).not.toBeNull()
    expect(result.mutedForegroundHex).not.toBeNull()
  })

  it('resolves independently per theme for the same custom background pair', () => {
    const light = resolveCustomBackgroundApplication(CUSTOM.light, 'light')
    const dark = resolveCustomBackgroundApplication(CUSTOM.dark, 'dark')
    expect(light.backgroundHex).toBe(CUSTOM.light)
    expect(dark.backgroundHex).toBe(CUSTOM.dark)
  })
})

describe('MAX_CUSTOM_BACKGROUNDS', () => {
  it('is 8, matching settingsSchema', () => {
    expect(MAX_CUSTOM_BACKGROUNDS).toBe(8)
  })
})

describe('resolveEffectiveBackgroundHex', () => {
  it('resolves a custom background id to its hex for the given theme', () => {
    expect(resolveEffectiveBackgroundHex(CUSTOM.id, [CUSTOM], 'light')).toBe(CUSTOM.light)
    expect(resolveEffectiveBackgroundHex(CUSTOM.id, [CUSTOM], 'dark')).toBe(CUSTOM.dark)
  })

  it('resolves a preset id to its hex (converted from oklch) for the given theme', () => {
    const hex = resolveEffectiveBackgroundHex('neutral', [], 'light')
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    expect(hex).toBe('#ffffff')
  })

  it('falls back to the neutral preset for an unknown id', () => {
    expect(resolveEffectiveBackgroundHex('bogus', [], 'light')).toBe('#ffffff')
  })
})
