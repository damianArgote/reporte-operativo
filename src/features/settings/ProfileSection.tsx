import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useReportStore } from '@/stores/reportStore'

const SAVED_FEEDBACK_MS = 1500

/**
 * "Perfil" section (T3): the user's name, shown only in-app (Today header
 * greeting) — never in the generated report (domain.md Decisions #17).
 * Saves on blur; a subtle "Guardado" text confirms it (no alerts/toasts).
 *
 * `draft` is only ever written by this component (typing + its own blur
 * save), so it's seeded once from `Settings.userName` at mount — no effect
 * needed to keep it synced with a value nothing else changes.
 */
export function ProfileSection() {
  const userName = useReportStore((state) => state.settings.userName)
  const updateSettings = useReportStore((state) => state.updateSettings)
  const [draft, setDraft] = useState(userName)
  const [saved, setSaved] = useState(false)

  async function handleBlur() {
    const trimmed = draft.trim()
    if (trimmed === userName) return
    await updateSettings({ userName: trimmed })
    setSaved(true)
    window.setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="profile-username">Nombre</Label>
      <div className="flex items-center gap-3">
        <Input
          id="profile-username"
          value={draft}
          placeholder="Tu nombre"
          maxLength={40}
          className="h-11 max-w-64"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void handleBlur()}
        />
        {saved && <span className="text-xs text-muted-foreground">Guardado</span>}
      </div>
    </div>
  )
}
