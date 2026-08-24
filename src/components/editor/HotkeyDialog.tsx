import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  formatHotkey,
  HOTKEY_DEFINITIONS,
  hotkeyFromEvent,
  type HotkeyAction,
  type Hotkeys,
} from '@/hotkeys'

export function HotkeyDialog({
  open,
  onOpenChange,
  hotkeys,
  onChange,
  onReset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hotkeys: Hotkeys
  onChange: (action: HotkeyAction, binding: string) => void
  onReset: () => void
}) {
  const [recording, setRecording] = useState<HotkeyAction | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setRecording(null)
      setConflict(null)
      onOpenChange(next)
    }}>
      <DialogContent className="max-h-[80vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Click a shortcut, then press its replacement. Press Backspace to clear it.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {(['File', 'Edit', 'Tools', 'View'] as const).map((group) => (
            <section key={group} className="mb-4 last:mb-0">
              <h3 className="mb-1 text-xs font-medium text-muted-foreground">{group}</h3>
              <div className="divide-y rounded-lg border">
                {HOTKEY_DEFINITIONS.filter((item) => item.group === group).map((item) => (
                  <div key={item.action} className="flex min-h-10 items-center justify-between gap-4 px-3">
                    <span>{item.label}</span>
                    <button
                      type="button"
                      className="min-w-28 rounded-md border bg-muted px-2 py-1 text-right font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Change shortcut for ${item.label}`}
                      onClick={() => {
                        setConflict(null)
                        setRecording(item.action)
                      }}
                      onKeyDown={(event) => {
                        if (recording !== item.action) return
                        event.preventDefault()
                        event.stopPropagation()
                        if (event.key === 'Escape') {
                          setRecording(null)
                          return
                        }
                        if (event.key === 'Backspace') {
                          onChange(item.action, '')
                          setRecording(null)
                          setConflict(null)
                          return
                        }
                        const binding = hotkeyFromEvent(event.nativeEvent)
                        if (!binding) return
                        const duplicate = HOTKEY_DEFINITIONS.find(
                          (candidate) => candidate.action !== item.action && hotkeys[candidate.action] === binding,
                        )
                        if (duplicate) {
                          setConflict(`${formatHotkey(binding)} is already assigned to ${duplicate.label}.`)
                          return
                        }
                        onChange(item.action, binding)
                        setRecording(null)
                        setConflict(null)
                      }}
                    >
                      {recording === item.action ? 'Press keys…' : formatHotkey(hotkeys[item.action])}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="flex min-h-8 items-center justify-between gap-3 border-t pt-3">
          <p className="text-xs text-destructive" role="status">{conflict}</p>
          <Button variant="outline" size="sm" onClick={() => {
            onReset()
            setRecording(null)
            setConflict(null)
          }}>
            Reset all
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
