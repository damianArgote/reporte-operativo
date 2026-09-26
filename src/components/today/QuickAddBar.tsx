import { useRef, useState, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useReportStore } from '@/stores/reportStore'

/**
 * Pinned quick free-text bar (thumb zone): fastest path to log a "Novedad"
 * without opening the add sheet. Enter submits; Shift+Enter inserts a
 * newline (kept verbatim in rawText, per domain.md invariant 5).
 */
export function QuickAddBar() {
  const [text, setText] = useState('')
  const addEntry = useReportStore((state) => state.addEntry)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function submit() {
    const trimmed = text.trim()
    if (trimmed === '') return
    await addEntry({ type: 'free', rawText: text })
    setText('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Label htmlFor="quick-add" className="sr-only">
        Escribir novedad
      </Label>
      <Textarea
        id="quick-add"
        ref={textareaRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribir novedad…"
        rows={1}
        className="min-h-11 flex-1 resize-none"
      />
      <Button type="submit" size="icon" aria-label="Enviar novedad" className="size-11 shrink-0 rounded-full">
        <Send />
      </Button>
    </form>
  )
}
