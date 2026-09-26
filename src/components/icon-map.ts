import { Car, CarFront, Construction, MessageSquare, Palette, Ticket, User, type LucideIcon } from 'lucide-react'

/**
 * Maps registry icon NAME strings (src/domain/entryTypeRegistry.ts,
 * src/features/settings/settingsSections.ts) to lucide-react components.
 * Registries store icon names, not components, so they never import
 * React/lucide themselves — this is the one small UI-side map that
 * resolves them, kept separate from domain logic per CLAUDE.md.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Car,
  CarFront,
  Construction,
  Ticket,
  MessageSquare,
  Palette,
  User,
}

export function getRegistryIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MessageSquare
}
