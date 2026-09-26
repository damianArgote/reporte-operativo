import type { ComponentType } from 'react'
import { AppearanceSection } from './AppearanceSection'
import { ProfileSection } from './ProfileSection'

/**
 * Central settings-sections registry (CLAUDE.md "registry-driven config"
 * pattern, same idea as src/domain/entryTypeRegistry.ts): adding a new
 * settings section is one entry here plus its component — SettingsScreen
 * never needs editing.
 */
export interface SettingsSectionConfig {
  id: string
  title: string
  description?: string
  /** Lucide icon name — resolved via src/components/icon-map.ts, never imported here. */
  icon: string
  component: ComponentType
}

export const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: 'appearance',
    title: 'Apariencia',
    description: 'Tema y color de fondo',
    icon: 'Palette',
    component: AppearanceSection,
  },
  {
    id: 'profile',
    title: 'Perfil',
    description: 'Tu nombre para saludarte en la app',
    icon: 'User',
    component: ProfileSection,
  },
]
