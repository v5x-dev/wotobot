import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { hotkeyUsesKey, matchesHotkey, type Hotkeys } from '@/hotkeys'

type EditorTool = 'transform' | 'move' | 'color'

export type EditorCommands = {
  hasSelection: boolean
  canDelete: boolean
  canPaste: boolean
  newFile: () => void
  openFile: () => Promise<void>
  saveFile: () => Promise<void>
  saveFileAs: () => Promise<void>
  undo: () => void
  redo: () => void
  cut: () => void
  copy: () => void
  paste: () => void
  duplicate: () => void
  deleteSelected: () => void
  selectAll: () => void
  groupSelected: () => void
  ungroupSelected: () => void
  stopPlacing: () => void
  startMoveSelection: () => void
  setTool: (tool: EditorTool) => void
  toggleRotatePlacement: () => void
  toggleHoles: () => void
  toggleGrid: () => void
  toggleOrtho: () => void
  placing: boolean
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  )
}

export function useEditorHotkeys(
  hotkeys: Hotkeys,
  commandsRef: RefObject<EditorCommands>,
  setFlipHole: Dispatch<SetStateAction<boolean>>,
  setRotatingPlacement: Dispatch<SetStateAction<boolean>>,
  dirty: boolean,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return
      const cmd = commandsRef.current
      if (event.key === 'Escape') {
        event.preventDefault()
        cmd.stopPlacing()
        setRotatingPlacement(false)
        return
      }
      if (isTypingTarget(event.target)) return

      const action = (
        binding: keyof Hotkeys,
        run: () => void,
        enabled = true,
      ) => {
        if (!matchesHotkey(event, hotkeys[binding])) return false
        if (enabled) run()
        event.preventDefault()
        return true
      }

      if (action('flipPlacement', () => setFlipHole(true))) return
      if (action('delete', cmd.deleteSelected, cmd.canDelete)) return
      if (action('rotatePlacement', cmd.toggleRotatePlacement, cmd.placing)) return
      if (action('toggleHoles', cmd.toggleHoles)) return
      if (action('toggleGrid', cmd.toggleGrid)) return
      if (action('toggleProjection', cmd.toggleOrtho)) return
      if (action('transformTool', () => cmd.setTool('transform'))) return
      if (action('moveTool', () => cmd.setTool('move'))) return
      if (action('colorTool', () => cmd.setTool('color'))) return
      if (action('moveSelection', cmd.startMoveSelection, cmd.hasSelection)) return
      if (action('newFile', cmd.newFile)) return
      if (action('openFile', () => void cmd.openFile())) return
      if (action('saveFileAs', () => void cmd.saveFileAs())) return
      if (action('saveFile', () => void cmd.saveFile())) return
      if (action('selectAll', cmd.selectAll)) return
      if (action('duplicate', cmd.duplicate, cmd.hasSelection)) return
      if (action('ungroup', cmd.ungroupSelected)) return
      if (action('group', cmd.groupSelected)) return
      if (action('redo', cmd.redo)) return
      if (action('undo', cmd.undo)) return
      if (action('cut', cmd.cut, cmd.hasSelection)) return
      if (action('copy', cmd.copy, cmd.hasSelection)) return
      action('paste', cmd.paste, cmd.canPaste)
    }

    function onKeyUp(event: KeyboardEvent) {
      if (hotkeyUsesKey(event, hotkeys.flipPlacement)) setFlipHole(false)
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [commandsRef, dirty, hotkeys, setFlipHole, setRotatingPlacement])
}
