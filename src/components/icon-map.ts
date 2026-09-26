import { Car, CarFront, Construction, MessageSquare, Ticket, type LucideIcon } from 'lucide-react'

/**
 * Maps the entry-type registry's icon NAME strings (src/domain/entryTypeRegistry.ts)
 * to lucide-react components. The registry stores icon names, not components,
 * so it never imports React/lucide — this is the one small UI-side map that
 * resolves them, kept separate from domain logic per CLAUDE.md.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Car,
  CarFront,
  Construction,
  Ticket,
  MessageSquare,
}

export function getRegistryIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MessageSquare
}
