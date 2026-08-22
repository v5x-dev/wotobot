import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Quaternion, Vector3 } from 'three'
import { connectionGraph, unionConnected } from '@/model/connections'
import {
  cloneParts,
  DEFAULT_CAMERA,
  nextInstanceId,
  parseDocument,
  partsListText,
  PASTE_OFFSET,
  serializeDocument,
  stemName,
  UNTITLED_NAME,
  withWbbExtension,
  type CameraState,
  type PlacedPart,
} from '@/persistence/document'
import {
  exportTextFile,
  isAbortError,
  openTextFile,
  saveTextFile,
  type FileSystemFileHandle,
} from '@/persistence/fileIO'
import { eulerToQuat, quatToEuler } from '@/model/math'
import {
  clonePolycarbonateShape,
  defaultPolycarbonateShape,
  findPart,
  paramError,
  partKey,
  rectanglePolygon,
  ZERO_ROTATION,
  type PartDefinition,
  type PolycarbonateShape,
} from '@/model/parts'

const MAX_HISTORY = 100

export type EditorTool = 'transform' | 'move' | 'color'

type Snapshot = {
  parts: PlacedPart[]
  selectedIds: number[]
  primaryId: number | null
  nextId: number
}

type ClipboardPart = Omit<PlacedPart, 'instanceId'>

export type PendingPart = {
  key: string
  param1: string
  param2: string
  rotation: [number, number, number]
  shape?: PolycarbonateShape
}

function sameVec3(a: [number, number, number], b: [number, number, number]) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

function explainError(error: unknown, fallback: string) {
  if (error instanceof SyntaxError) return 'That file is not valid JSON.'
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  )
}

const _quat = new Quaternion()
const _prev = new Quaternion()
const _delta = new Quaternion()
const _pos = new Vector3()
const _pivot = new Vector3()

export function useRobotEditor() {
  const [parts, setParts] = useState<PlacedPart[]>([])
  const [nextId, setNextId] = useState(1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [primaryId, setPrimaryId] = useState<number | null>(null)
  const [fileName, setFileName] = useState(UNTITLED_NAME)
  const [undoStack, setUndoStack] = useState<Snapshot[]>([])
  const [redoStack, setRedoStack] = useState<Snapshot[]>([])
  const [clipboard, setClipboard] = useState<ClipboardPart[]>([])
  const [placingPart, setPlacingPart] = useState<PendingPart | null>(null)
  const [movingSelection, setMovingSelection] = useState(false)
  const [tool, setTool] = useState<EditorTool>('transform')
  const [color, setColor] = useState<[number, number, number] | null>(null)
  const [flipHole, setFlipHole] = useState(false)
  const [rotatingPlacement, setRotatingPlacement] = useState(false)
  const [showHoles, setShowHoles] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [ortho, setOrtho] = useState(false)
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA)
  const savedJson = useRef(serializeDocument([]))
  const fileHandle = useRef<FileSystemFileHandle | null>(null)
  const ignorePointerMiss = useRef(false)
  const partsRef = useRef(parts)
  const selectedIdsRef = useRef(selectedIds)
  const primaryIdRef = useRef(primaryId)
  const nextIdRef = useRef(nextId)
  const placingPartRef = useRef(placingPart)
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const commandsRef = useRef({
    hasSelection: false,
    canPaste: false,
    newFile: () => {},
    openFile: async () => {},
    saveFile: async () => {},
    saveFileAs: async () => {},
    undo: () => {},
    redo: () => {},
    cut: () => {},
    copy: () => {},
    paste: () => {},
    duplicate: () => {},
    deleteSelected: () => {},
    selectAll: () => {},
    stopPlacing: () => {},
    startMoveSelection: () => {},
    setTool: (_tool: EditorTool) => {},
    toggleFlip: () => {},
    toggleRotatePlacement: () => {},
    toggleHoles: () => {},
    toggleGrid: () => {},
    toggleOrtho: () => {},
    placing: false,
  })

  partsRef.current = parts
  selectedIdsRef.current = selectedIds
  primaryIdRef.current = primaryId
  nextIdRef.current = nextId
  placingPartRef.current = placingPart
  toolRef.current = tool
  colorRef.current = color

  const graph = useMemo(() => connectionGraph(parts), [parts])
  const connectedIds = useMemo(
    () => unionConnected(selectedIds, graph),
    [selectedIds, graph],
  )

  const dirty = serializeDocument(parts, camera) !== savedJson.current
  const primary = parts.find((part) => part.instanceId === primaryId) ?? null

  const snapshot = useCallback(
    (): Snapshot => ({
      parts: cloneParts(partsRef.current),
      selectedIds: [...selectedIdsRef.current],
      primaryId: primaryIdRef.current,
      nextId: nextIdRef.current,
    }),
    [],
  )

  const pushHistory = useCallback(() => {
    setUndoStack((stack) => [...stack, snapshot()].slice(-MAX_HISTORY))
    setRedoStack([])
  }, [snapshot])

  const markSaved = useCallback((nextParts: PlacedPart[], nextCamera = camera) => {
    savedJson.current = serializeDocument(nextParts, nextCamera)
  }, [camera])

  const confirmDiscard = useCallback(() => {
    if (serializeDocument(partsRef.current, camera) === savedJson.current) return true
    return window.confirm('You have unsaved changes. Discard them?')
  }, [camera])

  const loadParts = useCallback(
    (
      nextParts: PlacedPart[],
      name: string,
      handle: FileSystemFileHandle | null,
      nextCamera: CameraState,
    ) => {
      setParts(cloneParts(nextParts))
      setNextId(nextInstanceId(nextParts))
      setSelectedIds([])
      setPrimaryId(null)
      setPlacingPart(null)
      setMovingSelection(false)
      setFileName(name)
      setUndoStack([])
      setRedoStack([])
      setCamera(nextCamera)
      setOrtho(nextCamera.ortho)
      fileHandle.current = handle
      markSaved(nextParts, nextCamera)
    },
    [markSaved],
  )

  const stopPlacing = useCallback(() => {
    setPlacingPart(null)
    setMovingSelection(false)
    setRotatingPlacement(false)
  }, [])

  const startPlacing = useCallback((part: PartDefinition, param1: string, param2: string) => {
    setSelectedIds([])
    setPrimaryId(null)
    setMovingSelection(false)
    setPlacingPart({
      key: partKey(part),
      param1,
      param2,
      rotation: [...ZERO_ROTATION],
      shape: part.generator === 'polycarbonate'
        ? defaultPolycarbonateShape(Number(param1) || 4, Number(param2) || 8)
        : undefined,
    })
  }, [])

  const updatePlacing = useCallback((param1: string, param2: string) => {
    setPlacingPart((current) => {
      if (!current) return current
      return {
        ...current,
        param1,
        param2,
        shape: current.shape
          ? { ...current.shape, points: rectanglePolygon(Number(param1) || 4, Number(param2) || 8), holes: [] }
          : current.shape,
      }
    })
  }, [])

  const updatePlacingRotation = useCallback((rotation: [number, number, number]) => {
    setPlacingPart((current) => (current ? { ...current, rotation } : current))
  }, [])

  const selectPart = useCallback((id: number, additive: boolean) => {
    if (toolRef.current === 'color') {
      const paint = colorRef.current
      pushHistory()
      setParts((current) =>
        current.map((part) => (part.instanceId === id ? { ...part, color: paint ? [...paint] : null } : part)),
      )
      if (additive) {
        setSelectedIds((current) => (current.includes(id) ? current : [...current, id]))
      } else {
        setSelectedIds([id])
      }
      setPrimaryId(id)
      return
    }
    if (additive) {
      setSelectedIds((current) => (current.includes(id) ? current : [...current, id]))
      setPrimaryId(id)
      return
    }
    setSelectedIds([id])
    setPrimaryId(id)
  }, [pushHistory])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
    setPrimaryId(null)
  }, [])

  const moveGroupTo = useCallback(
    (ids: Set<number>, primaryFrom: PlacedPart, position: [number, number, number], rotation: [number, number, number]) => {
      eulerToQuat(primaryFrom.rotation, _prev)
      eulerToQuat(rotation, _quat)
      _delta.copy(_quat).multiply(_prev.invert())
      _pivot.set(...primaryFrom.position)
      setParts((current) =>
        current.map((part) => {
          if (!ids.has(part.instanceId)) return part
          if (part.instanceId === primaryFrom.instanceId) {
            return { ...part, position: [...position], rotation: [...rotation] }
          }
          _pos.set(...part.position).sub(_pivot).applyQuaternion(_delta)
          _pos.x += position[0]
          _pos.y += position[1]
          _pos.z += position[2]
          eulerToQuat(part.rotation, _quat)
          _quat.premultiply(_delta)
          return {
            ...part,
            position: [_pos.x, _pos.y, _pos.z],
            rotation: quatToEuler(_quat),
          }
        }),
      )
    },
    [],
  )

  const placeAt = useCallback(
    (
      position: [number, number, number],
      rotation: [number, number, number],
      pending?: Pick<PlacedPart, 'key' | 'param1' | 'param2' | 'shape'> | null,
    ) => {
      const toPlace = pending ?? placingPartRef.current
      if (!toPlace) return
      const definition = findPart(toPlace.key)
      if (
        definition &&
        (paramError(definition.param1, toPlace.param1) ||
          paramError(definition.param2, toPlace.param2))
      ) {
        return
      }

      if (movingSelection) {
        const id = primaryIdRef.current ?? selectedIdsRef.current[0]
        const source = partsRef.current.find((part) => part.instanceId === id)
        if (!source) return
        pushHistory()
        const ids = unionConnected(selectedIdsRef.current.length ? selectedIdsRef.current : [source.instanceId], connectionGraph(partsRef.current))
        moveGroupTo(ids, source, position, rotation)
        stopPlacing()
        return
      }

      pushHistory()
      const id = nextIdRef.current
      const shape = toPlace.shape ?? (
        definition?.generator === 'polycarbonate'
          ? defaultPolycarbonateShape(Number(toPlace.param1) || 4, Number(toPlace.param2) || 8)
          : undefined
      )
      setParts((current) => [
        ...current,
        {
          instanceId: id,
          key: toPlace.key,
          param1: toPlace.param1,
          param2: toPlace.param2,
          position,
          rotation: [...rotation],
          color: null,
          shape,
        },
      ])
      setNextId(id + 1)
    },
    [moveGroupTo, movingSelection, pushHistory, stopPlacing],
  )

  const transformPart = useCallback(
    (id: number, position: [number, number, number], rotation: [number, number, number]) => {
      const current = partsRef.current.find((part) => part.instanceId === id)
      if (
        !current ||
        (sameVec3(current.position, position) && sameVec3(current.rotation, rotation))
      ) {
        return
      }
      pushHistory()
      const ids = unionConnected(
        selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id],
        connectionGraph(partsRef.current),
      )
      moveGroupTo(ids, current, position, rotation)
    },
    [moveGroupTo, pushHistory],
  )

  const deleteSelected = useCallback(() => {
    const ids = unionConnected(selectedIdsRef.current, connectionGraph(partsRef.current))
    if (ids.size === 0) return
    pushHistory()
    setParts((current) => current.filter((part) => !ids.has(part.instanceId)))
    setSelectedIds([])
    setPrimaryId(null)
  }, [pushHistory])

  const copy = useCallback(() => {
    const ids = unionConnected(selectedIdsRef.current, connectionGraph(partsRef.current))
    if (ids.size === 0) return
    setClipboard(
      partsRef.current
        .filter((part) => ids.has(part.instanceId))
        .map((part) => ({
          key: part.key,
          param1: part.param1,
          param2: part.param2,
          position: [...part.position] as [number, number, number],
          rotation: [...part.rotation] as [number, number, number],
          color: part.color ? [...part.color] as [number, number, number] : null,
          shape: part.shape ? clonePolycarbonateShape(part.shape) : undefined,
        })),
    )
  }, [])

  const cut = useCallback(() => {
    if (selectedIdsRef.current.length === 0) return
    copy()
    deleteSelected()
  }, [copy, deleteSelected])

  const paste = useCallback(() => {
    if (clipboard.length === 0) return
    pushHistory()
    let id = nextIdRef.current
    const pasted = clipboard.map((part) => {
      const instanceId = id
      id += 1
      return {
        ...part,
        instanceId,
        position: [
          part.position[0] + PASTE_OFFSET,
          part.position[1],
          part.position[2] + PASTE_OFFSET,
        ] as [number, number, number],
      }
    })
    setParts((current) => [...current, ...pasted])
    setNextId(id)
    setSelectedIds(pasted.map((part) => part.instanceId))
    setPrimaryId(pasted[pasted.length - 1]?.instanceId ?? null)
    setClipboard(
      clipboard.map((part) => ({
        ...part,
        position: [
          part.position[0] + PASTE_OFFSET,
          part.position[1],
          part.position[2] + PASTE_OFFSET,
        ],
      })),
    )
  }, [clipboard, pushHistory])

  const duplicate = useCallback(() => {
    const ids = unionConnected(selectedIdsRef.current, connectionGraph(partsRef.current))
    if (ids.size === 0) return
    pushHistory()
    let id = nextIdRef.current
    const copies: PlacedPart[] = []
    for (const part of partsRef.current) {
      if (!ids.has(part.instanceId)) continue
      copies.push({
        ...part,
        instanceId: id,
        position: [part.position[0] + PASTE_OFFSET, part.position[1], part.position[2] + PASTE_OFFSET],
        color: part.color ? [...part.color] : null,
      })
      id += 1
    }
    setParts((current) => [...current, ...copies])
    setNextId(id)
    setSelectedIds(copies.map((part) => part.instanceId))
    setPrimaryId(copies[copies.length - 1]?.instanceId ?? null)
  }, [pushHistory])

  const selectAll = useCallback(() => {
    const ids = partsRef.current.map((part) => part.instanceId)
    setSelectedIds(ids)
    setPrimaryId(ids.at(-1) ?? null)
  }, [])

  const startMoveSelection = useCallback(() => {
    const id = primaryIdRef.current ?? selectedIdsRef.current[0]
    const selected = partsRef.current.find((part) => part.instanceId === id)
    if (!selected) return
    setMovingSelection(true)
    setPlacingPart({
      key: selected.key,
      param1: selected.param1,
      param2: selected.param2,
      rotation: [...selected.rotation],
      shape: selected.shape ? clonePolycarbonateShape(selected.shape) : undefined,
    })
  }, [])

  const paintSelected = useCallback(
    (next: [number, number, number] | null) => {
      const ids = new Set(selectedIdsRef.current)
      if (ids.size === 0) return
      pushHistory()
      setParts((current) =>
        current.map((part) => (ids.has(part.instanceId) ? { ...part, color: next ? [...next] : null } : part)),
      )
    },
    [pushHistory],
  )

  const updatePartShape = useCallback((id: number, shape: PolycarbonateShape, param1: string, param2: string) => {
    const current = partsRef.current.find((part) => part.instanceId === id)
    if (!current) return
    pushHistory()
    setParts((parts) => parts.map((part) => part.instanceId === id
      ? { ...part, param1, param2, shape: clonePolycarbonateShape(shape) }
      : part))
  }, [pushHistory])

  const undo = useCallback(() => {
    const prev = undoStack.at(-1)
    if (!prev) return
    setRedoStack((stack) => [...stack, snapshot()])
    setUndoStack((stack) => stack.slice(0, -1))
    setParts(cloneParts(prev.parts))
    setSelectedIds([...prev.selectedIds])
    setPrimaryId(prev.primaryId)
    setNextId(prev.nextId)
  }, [snapshot, undoStack])

  const redo = useCallback(() => {
    const next = redoStack.at(-1)
    if (!next) return
    setUndoStack((stack) => [...stack, snapshot()])
    setRedoStack((stack) => stack.slice(0, -1))
    setParts(cloneParts(next.parts))
    setSelectedIds([...next.selectedIds])
    setPrimaryId(next.primaryId)
    setNextId(next.nextId)
  }, [redoStack, snapshot])

  const newFile = useCallback(() => {
    if (!confirmDiscard()) return
    loadParts([], UNTITLED_NAME, null, DEFAULT_CAMERA)
  }, [confirmDiscard, loadParts])

  const openFile = useCallback(async () => {
    if (!confirmDiscard()) return
    try {
      const picked = await openTextFile()
      if (!picked) return
      const parsed = parseDocument(picked.text)
      loadParts(parsed.parts, picked.name, picked.handle, parsed.camera)
    } catch (error) {
      if (isAbortError(error)) return
      window.alert(explainError(error, 'Could not open that file.'))
    }
  }, [confirmDiscard, loadParts])

  const saveToHandle = useCallback(
    async (handle: FileSystemFileHandle | null) => {
      const toSave = cloneParts(partsRef.current)
      try {
        const saved = await saveTextFile({
          text: serializeDocument(toSave, camera),
          suggestedName: withWbbExtension(fileName),
          handle,
        })
        if (!saved) return
        fileHandle.current = saved.handle
        setFileName(withWbbExtension(saved.name))
        markSaved(toSave, camera)
      } catch (error) {
        if (isAbortError(error)) return
        window.alert(explainError(error, 'Could not save that file.'))
      }
    },
    [camera, fileName, markSaved],
  )

  const saveFile = useCallback(async () => {
    await saveToHandle(fileHandle.current)
  }, [saveToHandle])

  const saveFileAs = useCallback(async () => {
    await saveToHandle(null)
  }, [saveToHandle])

  const exportParts = useCallback(async () => {
    try {
      await exportTextFile(`${stemName(fileName)}-parts.txt`, partsListText(partsRef.current))
    } catch (error) {
      if (isAbortError(error)) return
      window.alert(explainError(error, 'Could not export the parts list.'))
    }
  }, [fileName])

  const renameFile = useCallback((name: string) => {
    const next = withWbbExtension(name.trim() || 'untitled')
    setFileName(next)
  }, [])

  const onMoveStart = useCallback(() => {
    ignorePointerMiss.current = true
  }, [])

  const onMoveEnd = useCallback(() => {
    window.setTimeout(() => {
      ignorePointerMiss.current = false
    }, 0)
  }, [])

  const onPointerMissed = useCallback((event: { button: number }) => {
    if (event.button !== 0) return
    if (placingPartRef.current) return
    if (!ignorePointerMiss.current) clearSelection()
  }, [clearSelection])

  const chooseTool = useCallback(
    (next: EditorTool) => {
      setTool(next)
      if (next === 'move') startMoveSelection()
      if (next !== 'move' && movingSelection) stopPlacing()
    },
    [movingSelection, startMoveSelection, stopPlacing],
  )

  const toggleHoles = useCallback(() => {
    setShowHoles((value) => !value)
  }, [])

  commandsRef.current = {
    hasSelection: selectedIds.length > 0,
    canPaste: clipboard.length > 0,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    undo,
    redo,
    cut,
    copy,
    paste,
    duplicate,
    deleteSelected,
    selectAll,
    stopPlacing,
    startMoveSelection,
    setTool: chooseTool,
    toggleFlip: () => setFlipHole((value) => !value),
    toggleRotatePlacement: () => setRotatingPlacement((value) => !value),
    toggleHoles,
    toggleGrid: () => setShowGrid((value) => !value),
    toggleOrtho: () => {
      setOrtho((value) => {
        const next = !value
        setCamera((current) => ({ ...current, ortho: next }))
        return next
      })
    },
    placing: placingPart != null,
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return
      const cmd = commandsRef.current
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (event.key === 'Escape') {
        event.preventDefault()
        cmd.stopPlacing()
        setRotatingPlacement(false)
        return
      }

      if (isTypingTarget(event.target)) return

      if (!mod && !event.altKey && event.code === 'Space') {
        event.preventDefault()
        setFlipHole(true)
        return
      }

      if (!mod && !event.altKey && (event.key === 'Backspace' || event.key === 'Delete')) {
        if (cmd.hasSelection) {
          event.preventDefault()
          cmd.deleteSelected()
        }
        return
      }

      if (!mod && !event.altKey && key === 'r' && cmd.placing) {
        event.preventDefault()
        cmd.toggleRotatePlacement()
        return
      }

      if (!mod && !event.altKey && key === 'h') {
        event.preventDefault()
        cmd.toggleHoles()
        return
      }
      if (!mod && !event.altKey && key === 'g') {
        event.preventDefault()
        cmd.toggleGrid()
        return
      }
      if (!mod && !event.altKey && key === 'o') {
        event.preventDefault()
        cmd.toggleOrtho()
        return
      }
      if (!mod && !event.altKey && key === '1') {
        cmd.setTool('transform')
        return
      }
      if (!mod && !event.altKey && key === '2') {
        cmd.setTool('move')
        return
      }
      if (!mod && !event.altKey && key === '3') {
        cmd.setTool('color')
        return
      }

      if (!mod || event.altKey) {
        if (event.shiftKey && key === 'd' && cmd.hasSelection) {
          event.preventDefault()
          cmd.startMoveSelection()
        }
        return
      }

      if (key === 'n') {
        event.preventDefault()
        cmd.newFile()
        return
      }
      if (key === 'o') {
        event.preventDefault()
        void cmd.openFile()
        return
      }
      if (key === 's') {
        event.preventDefault()
        if (event.shiftKey) void cmd.saveFileAs()
        else void cmd.saveFile()
        return
      }
      if (key === 'a') {
        event.preventDefault()
        cmd.selectAll()
        return
      }
      if (key === 'd' && cmd.hasSelection) {
        event.preventDefault()
        cmd.duplicate()
        return
      }
      if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        cmd.redo()
        return
      }
      if (key === 'z') {
        event.preventDefault()
        cmd.undo()
        return
      }
      if (key === 'y') {
        event.preventDefault()
        cmd.redo()
        return
      }
      if (key === 'x' && cmd.hasSelection) {
        event.preventDefault()
        cmd.cut()
        return
      }
      if (key === 'c' && cmd.hasSelection) {
        event.preventDefault()
        cmd.copy()
        return
      }
      if (key === 'v' && cmd.canPaste) {
        event.preventDefault()
        cmd.paste()
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === 'Space') setFlipHole(false)
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (serializeDocument(partsRef.current, camera) === savedJson.current) return
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
  }, [camera])

  return {
    parts,
    selectedIds,
    primaryId,
    primary,
    connectedIds,
    fileName,
    dirty,
    placingPart,
    movingSelection,
    tool,
    setTool: chooseTool,
    color,
    setColor,
    paintSelected,
    toggleHoles,
    flipHole,
    rotatingPlacement,
    showHoles,
    showGrid,
    ortho,
    camera,
    setCamera,
    startPlacing,
    updatePlacing,
    updatePlacingRotation,
    stopPlacing,
    startMoveSelection,
    placeAt,
    transformPart,
    updatePartShape,
    selectPart,
    onMoveStart,
    onMoveEnd,
    onPointerMissed,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    hasSelection: selectedIds.length > 0,
    canPaste: clipboard.length > 0,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    exportParts,
    renameFile,
    undo,
    redo,
    cut,
    copy,
    paste,
    duplicate,
    selectAll,
    deleteSelected,
  }
}
