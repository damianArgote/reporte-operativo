import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getEntryTypeConfig } from '@/domain/entryTypeRegistry'
import { useReportStore } from '@/stores/reportStore'
import { currentTime } from '@/utils/dates'
import type { EntryTypeId } from '@/types/entryTypeIds'
import type { DailyEntry, EntryFields } from '@/types/schemas'

type FieldValues = Partial<Record<keyof EntryFields, string>>

interface FormState {
  time: string
  towed: boolean
  denounced: boolean
  includeInReport: boolean
  fieldValues: FieldValues
  rawText: string
}

function buildInitialState(
  typeId: EntryTypeId,
  initial: DailyEntry | undefined,
  denouncedPreset: boolean,
): FormState {
  const config = getEntryTypeConfig(typeId)

  if (initial) {
    const fieldValues: FieldValues = {}
    for (const field of config.fields) {
      if (field.key === 'rawText') continue
      fieldValues[field.key] = initial.fields[field.key] ?? ''
    }
    return {
      time: initial.time,
      towed: initial.towed,
      denounced: initial.denounced,
      includeInReport: initial.includeInReport,
      fieldValues,
      rawText: initial.rawText ?? '',
    }
  }

  return {
    time: currentTime(),
    towed: config.towedByDefault,
    denounced: denouncedPreset,
    includeInReport: true,
    fieldValues: {},
    rawText: '',
  }
}

export interface EntryFormProps {
  typeId: EntryTypeId
  mode: 'create' | 'edit'
  initial?: DailyEntry
  denouncedPreset?: boolean
  onCancel: () => void
  /** Called after a successful save that should close the sheet (not "Agregar y otro"). */
  onSubmitted: () => void
}

export function EntryForm({
  typeId,
  mode,
  initial,
  denouncedPreset = false,
  onCancel,
  onSubmitted,
}: EntryFormProps) {
  const addEntry = useReportStore((state) => state.addEntry)
  const updateEntry = useReportStore((state) => state.updateEntry)
  const config = getEntryTypeConfig(typeId)

  const [form, setForm] = useState<FormState>(() => buildInitialState(typeId, initial, denouncedPreset))
  const [errors, setErrors] = useState<Set<string>>(new Set())
  const [resetToken, setResetToken] = useState(0)
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  function assignFirstFieldRef(el: HTMLInputElement | HTMLTextAreaElement | null) {
    firstFieldRef.current = el
  }

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [resetToken])

  function setFieldValue(key: keyof EntryFields, value: string) {
    setForm((prev) => ({ ...prev, fieldValues: { ...prev.fieldValues, [key]: value } }))
  }

  function validate(): boolean {
    const missing = new Set<string>()
    for (const field of config.fields) {
      if (!field.required) continue
      const value = field.key === 'rawText' ? form.rawText : (form.fieldValues[field.key] ?? '')
      if (value.trim() === '') missing.add(field.key)
    }
    setErrors(missing)
    return missing.size === 0
  }

  async function handleSubmit(andAnother: boolean) {
    if (!validate()) return

    const fields: EntryFields = {}
    for (const field of config.fields) {
      if (field.key === 'rawText') continue
      const value = form.fieldValues[field.key]
      if (value !== undefined && value !== '') fields[field.key] = value
    }

    if (mode === 'create') {
      await addEntry({
        type: typeId,
        time: form.time,
        towed: form.towed,
        denounced: form.denounced,
        includeInReport: form.includeInReport,
        fields,
        rawText: typeId === 'free' ? form.rawText : undefined,
      })
    } else if (initial) {
      await updateEntry(initial.id, {
        time: form.time,
        towed: form.towed,
        denounced: form.denounced,
        includeInReport: form.includeInReport,
        fields,
        rawText: typeId === 'free' ? form.rawText : undefined,
      })
    }

    if (andAnother) {
      setForm(buildInitialState(typeId, undefined, denouncedPreset))
      setErrors(new Set())
      setResetToken((token) => token + 1)
    } else {
      onSubmitted()
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit(false)
      }}
    >
      <div className="flex flex-col gap-3">
        {config.fields.map((field, index) => {
          const isFirst = index === 0
          if (field.key === 'rawText') {
            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
                <Textarea
                  id={`field-${field.key}`}
                  ref={isFirst ? assignFirstFieldRef : undefined}
                  value={form.rawText}
                  onChange={(event) => setForm((prev) => ({ ...prev, rawText: event.target.value }))}
                  aria-invalid={errors.has(field.key)}
                  rows={3}
                />
              </div>
            )
          }

          // Captured into its own const so the narrowed type (excludes
          // 'rawText', handled above) survives inside the closures below —
          // TS doesn't retain a property-access narrowing across a nested
          // function boundary.
          const key = field.key
          const isPlate = key === 'plate'
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`field-${key}`}>{field.label}</Label>
              <Input
                id={`field-${key}`}
                ref={isFirst ? assignFirstFieldRef : undefined}
                value={form.fieldValues[key] ?? ''}
                onChange={(event) => setFieldValue(key, event.target.value)}
                inputMode={field.inputMode === 'numeric' ? 'numeric' : 'text'}
                autoCapitalize={isPlate ? 'characters' : undefined}
                className={isPlate ? 'uppercase' : undefined}
                aria-invalid={errors.has(key)}
              />
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="entry-time">Hora</Label>
        <Input
          id="entry-time"
          type="time"
          value={form.time}
          onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
          className="w-32"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="entry-towed">Va a playa</Label>
          <Switch
            id="entry-towed"
            checked={form.towed}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, towed: checked }))}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="entry-denounced">Denuncia</Label>
          <Switch
            id="entry-denounced"
            checked={form.denounced}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, denounced: checked }))}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="entry-include">Incluir en reporte</Label>
          <Switch
            id="entry-include"
            checked={form.includeInReport}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, includeInReport: checked }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        {mode === 'create' ? (
          <>
            <Button type="submit" size="lg" className="h-11">
              Agregar
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => void handleSubmit(true)}>
              Agregar y otro
            </Button>
          </>
        ) : (
          <Button type="submit" size="lg" className="h-11">
            Guardar
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
