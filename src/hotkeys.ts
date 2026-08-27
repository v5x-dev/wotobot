import { useCallback, useState } from 'react'

export type HotkeyAction =
  | 'newFile' | 'openFile' | 'saveFile' | 'saveFileAs'
  | 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'duplicate' | 'selectAll'
  | 'group' | 'ungroup' | 'delete' | 'moveSelection'
  | 'focus' | 'toggleHoles' | 'toggleGrid' | 'toggleProjection'
  | 'transformTool' | 'colorTool' | 'rotatePlacement'
  | 'flipPlacement' | 'boxSelect'

export type Hotkeys = Record<HotkeyAction, string>

export type HotkeyDefinition = {
  action: HotkeyAction
  label: string
  group: 'File' | 'Edit' | 'Tools' | 'View'
  defaultBinding: string
}

export const HOTKEY_DEFINITIONS: HotkeyDefinition[] = [
  { action: 'newFile', label: 'New', group: 'File', defaultBinding: 'Mod+N' },
  { action: 'openFile', label: 'Open', group: 'File', defaultBinding: 'Mod+O' },
  { action: 'saveFile', label: 'Save', group: 'File', defaultBinding: 'Mod+S' },
  { action: 'saveFileAs', label: 'Save as', group: 'File', defaultBinding: 'Mod+Shift+S' },
  { action: 'undo', label: 'Undo', group: 'Edit', defaultBinding: 'Mod+Z' },
  { action: 'redo', label: 'Redo', group: 'Edit', defaultBinding: 'Mod+Shift+Z' },
  { action: 'cut', label: 'Cut', group: 'Edit', defaultBinding: 'Mod+X' },
  { action: 'copy', label: 'Copy', group: 'Edit', defaultBinding: 'Mod+C' },
  { action: 'paste', label: 'Paste', group: 'Edit', defaultBinding: 'Mod+V' },
  { action: 'duplicate', label: 'Duplicate', group: 'Edit', defaultBinding: 'Mod+D' },
  { action: 'selectAll', label: 'Select all', group: 'Edit', defaultBinding: 'Mod+A' },
  { action: 'group', label: 'Group', group: 'Edit', defaultBinding: 'Mod+G' },
  { action: 'ungroup', label: 'Ungroup', group: 'Edit', defaultBinding: 'Mod+Shift+G' },
  { action: 'delete', label: 'Delete selection', group: 'Edit', defaultBinding: 'Delete' },
  { action: 'moveSelection', label: 'Move selection', group: 'Edit', defaultBinding: 'Shift+D' },
  { action: 'transformTool', label: 'Transform tool', group: 'Tools', defaultBinding: '1' },
  { action: 'colorTool', label: 'Color tool', group: 'Tools', defaultBinding: '2' },
  { action: 'rotatePlacement', label: 'Rotate placement', group: 'Tools', defaultBinding: 'R' },
  { action: 'flipPlacement', label: 'Flip placement', group: 'Tools', defaultBinding: 'Space' },
  { action: 'boxSelect', label: 'Box select', group: 'Tools', defaultBinding: 'B' },
  { action: 'focus', label: 'Frame model', group: 'View', defaultBinding: 'F' },
  { action: 'toggleHoles', label: 'Show holes', group: 'View', defaultBinding: 'H' },
  { action: 'toggleGrid', label: 'Show grid', group: 'View', defaultBinding: 'Shift+G' },
  { action: 'toggleProjection', label: 'Toggle projection', group: 'View', defaultBinding: 'O' },
]

export const DEFAULT_HOTKEYS = Object.fromEntries(
  HOTKEY_DEFINITIONS.map(({ action, defaultBinding }) => [action, defaultBinding]),
) as Hotkeys

const STORAGE_KEY = 'protobot.hotkeys.v1'
const IS_APPLE = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

function eventKey(event: KeyboardEvent) {
  if (event.code === 'Space') return 'Space'
  if (event.key === ' ') return 'Space'
  if (event.key === 'Backspace') return 'Backspace'
  if (event.key === 'Delete') return 'Delete'
  if (event.key === 'Escape') return 'Escape'
  if (event.key === 'Enter') return 'Enter'
  if (event.key === 'Tab') return 'Tab'
  if (event.key.startsWith('Arrow')) return event.key
  return event.key.length === 1 ? event.key.toUpperCase() : event.key
}

export function hotkeyFromEvent(event: KeyboardEvent) {
  if (['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) return null
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Mod')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')
  parts.push(eventKey(event))
  return parts.join('+')
}

export function matchesHotkey(event: KeyboardEvent, binding: string) {
  return binding !== '' && hotkeyFromEvent(event) === binding
}

export function matchesDeleteHotkey(event: KeyboardEvent, binding: string) {
  return hotkeyFromEvent(event) === 'Backspace' || matchesHotkey(event, binding)
}

export function hotkeyUsesKey(event: KeyboardEvent, binding: string) {
  return binding !== '' && binding.split('+').at(-1) === eventKey(event)
}

export function formatHotkey(binding: string) {
  if (!binding) return 'Unassigned'
  if (!IS_APPLE) return binding.replace('Mod', 'Ctrl')
  return binding
    .replace('Mod', '⌘')
    .replace('Shift', '⇧')
    .replace('Alt', '⌥')
    .replaceAll('+', '')
}

function loadHotkeys(): Hotkeys {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    return Object.fromEntries(HOTKEY_DEFINITIONS.map(({ action }) => [
      action,
      typeof saved[action] === 'string' ? saved[action] : DEFAULT_HOTKEYS[action],
    ])) as Hotkeys
  } catch {
    return { ...DEFAULT_HOTKEYS }
  }
}

export function useHotkeys() {
  const [hotkeys, setHotkeysState] = useState<Hotkeys>(loadHotkeys)
  const setHotkey = useCallback((action: HotkeyAction, binding: string) => {
    setHotkeysState((current) => {
      const next = { ...current, [action]: binding }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])
  const resetHotkeys = useCallback(() => {
    const next = { ...DEFAULT_HOTKEYS }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setHotkeysState(next)
  }, [])
  return { hotkeys, setHotkey, resetHotkeys }
}
