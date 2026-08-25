import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Quaternion, Vector3 } from 'three'
import { effectiveGraph, unionConnected } from '@/model/connections'
import {
  chainedSprocketIds,
  chainLinkCount,
  chainSelection,
  isSprocket,
  nextChainId,
  sameChainPair,
  type SprocketChain,
} from '@/model/chains'
import {
  cloneChains,
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
import type { Hotkeys } from '@/hotkeys'
import { useEditorHotkeys, type EditorCommands } from './useEditorHotkeys'
import {
  clonePolycarbonateShape,
  defaultPolycarbonateShape,
  findPart,
  nextGroupId,
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
  chains: SprocketChain[]
  selectedIds: number[]
  selectedChainId: number | null
  primaryId: number | null
  nextId: number
}

type ClipboardPart = Omit<PlacedPart, 'instanceId'>

type ClipboardChain = {
  sprocketAIndex: number
  sprocketBIndex: number
}

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

const _quat = new Quaternion()
const _prev = new Quaternion()
const _delta = new Quaternion()
const _chainRotation = new Quaternion()
const _pos = new Vector3()
const _pivot = new Vector3()
const _axis = new Vector3()

const AXIAL_ROTATION_TOLERANCE = Math.cos(Math.PI / 180)

function sprocketAxialRotation(
  part: PlacedPart,
  rotation: [number, number, number],
) {
  eulerToQuat(part.rotation, _prev)
  eulerToQuat(rotation, _quat)
  _delta.copy(_quat).multiply(_prev.clone().invert()).normalize()

  const vectorLength = Math.hypot(_delta.x, _delta.y, _delta.z)
  if (vectorLength < 1e-8) return null

  _axis.set(0, 0, 1).applyQuaternion(_prev).normalize()
  const direction = (_delta.x * _axis.x + _delta.y * _axis.y + _delta.z * _axis.z) / vectorLength
  if (Math.abs(direction) < AXIAL_ROTATION_TOLERANCE) return null

  let angle = 2 * Math.atan2(vectorLength, _delta.w)
  if (angle > Math.PI) angle -= Math.PI * 2
  angle *= Math.sign(direction)
  return { axis: _axis.clone(), angle }
}

function debugStartupParts(): PlacedPart[] {
  if (typeof window === 'undefined') return []
  if (new URLSearchParams(window.location.search).get('debug') !== 'hs30') return []
  return [
    {
      instanceId: 1,
      key: 'Motion:SPKT:Sprocket',
      param1: 'High Strength',
      param2: '30T',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      color: null,
    },
  ]
}

export function useRobotEditor(hotkeys: Hotkeys) {
  const [parts, setParts] = useState<PlacedPart[]>(() => debugStartupParts())
  const [chains, setChains] = useState<SprocketChain[]>([])
  const [nextId, setNextId] = useState(() => (debugStartupParts().length > 0 ? 2 : 1))
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null)
  const [primaryId, setPrimaryId] = useState<number | null>(null)
  const [fileName, setFileName] = useState(UNTITLED_NAME)
  const [undoStack, setUndoStack] = useState<Snapshot[]>([])
  const [redoStack, setRedoStack] = useState<Snapshot[]>([])
  const [clipboard, setClipboard] = useState<ClipboardPart[]>([])
  const [clipboardChains, setClipboardChains] = useState<ClipboardChain[]>([])
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
  const [savedJson, setSavedJson] = useState(() => serializeDocument([], DEFAULT_CAMERA, []))
  const fileHandle = useRef<FileSystemFileHandle | null>(null)
  const ignorePointerMiss = useRef(false)
  const partsRef = useRef(parts)
  const chainsRef = useRef(chains)
  const selectedIdsRef = useRef(selectedIds)
  const selectedChainIdRef = useRef(selectedChainId)
  const primaryIdRef = useRef(primaryId)
  const nextIdRef = useRef(nextId)
  const placingPartRef = useRef(placingPart)
  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const activeTransformRef = useRef<Snapshot | null>(null)
  const commandsRef = useRef<EditorCommands>({
    hasSelection: false,
    canDelete: false,
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
    groupSelected: () => {},
    ungroupSelected: () => {},
    stopPlacing: () => {},
    startMoveSelection: () => {},
    setTool: (_tool: EditorTool) => {},
    toggleRotatePlacement: () => {},
    toggleHoles: () => {},
    toggleGrid: () => {},
    toggleOrtho: () => {},
    placing: false,
  })

  useLayoutEffect(() => {
    partsRef.current = parts
    chainsRef.current = chains
    selectedIdsRef.current = selectedIds
    selectedChainIdRef.current = selectedChainId
    primaryIdRef.current = primaryId
    nextIdRef.current = nextId
    placingPartRef.current = placingPart
    toolRef.current = tool
    colorRef.current = color
  }, [chains, color, nextId, parts, placingPart, primaryId, selectedChainId, selectedIds, tool])

  const graph = useMemo(() => effectiveGraph(parts), [parts])
  const connectedIds = useMemo(
    () => unionConnected(selectedIds, graph),
    [selectedIds, graph],
  )

  const dirty = serializeDocument(parts, camera, chains) !== savedJson
  const primary = parts.find((part) => part.instanceId === primaryId) ?? null
  const selectedChain = chains.find((chain) => chain.id === selectedChainId) ?? null
  const selectedChainLinkCount = useMemo(() => {
    if (!selectedChain) return 0
    const a = parts.find((part) => part.instanceId === selectedChain.sprocketAId)
    const b = parts.find((part) => part.instanceId === selectedChain.sprocketBId)
    return a && b ? chainLinkCount(a, b) : 0
  }, [parts, selectedChain])

  const snapshot = useCallback(
    (): Snapshot => ({
      parts: cloneParts(partsRef.current),
      chains: cloneChains(chainsRef.current),
      selectedIds: [...selectedIdsRef.current],
      selectedChainId: selectedChainIdRef.current,
      primaryId: primaryIdRef.current,
      nextId: nextIdRef.current,
    }),
    [],
  )

  const pushHistory = useCallback(() => {
    setUndoStack((stack) => [...stack, snapshot()].slice(-MAX_HISTORY))
    setRedoStack([])
  }, [snapshot])

  const markSaved = useCallback(
    (nextParts: PlacedPart[], nextChains: SprocketChain[], nextCamera = camera) => {
      setSavedJson(serializeDocument(nextParts, nextCamera, nextChains))
    },
    [camera],
  )

  const confirmDiscard = useCallback(() => {
    if (serializeDocument(partsRef.current, camera, chainsRef.current) === savedJson) return true
    return window.confirm('You have unsaved changes. Discard them?')
  }, [camera, savedJson])

  const loadParts = useCallback(
    (
      nextParts: PlacedPart[],
      nextChains: SprocketChain[],
      name: string,
      handle: FileSystemFileHandle | null,
      nextCamera: CameraState,
    ) => {
      setParts(cloneParts(nextParts))
      setChains(cloneChains(nextChains))
      setNextId(nextInstanceId(nextParts))
      setSelectedIds([])
      setSelectedChainId(null)
      setPrimaryId(null)
      setPlacingPart(null)
      setMovingSelection(false)
      setFileName(name)
      setUndoStack([])
      setRedoStack([])
      setCamera(nextCamera)
      setOrtho(nextCamera.ortho)
      fileHandle.current = handle
      markSaved(nextParts, nextChains, nextCamera)
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
    setSelectedChainId(null)
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
    setSelectedChainId(null)
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
    setSelectedChainId(null)
    setPrimaryId(null)
  }, [])

  const selectChain = useCallback((id: number) => {
    setSelectedIds([])
    setPrimaryId(null)
    setSelectedChainId(id)
  }, [])

  const moveGroupTo = useCallback(
    (
      ids: Set<number>,
      primaryFrom: PlacedPart,
      position: [number, number, number],
      rotation: [number, number, number],
      chainedRotation?: { ids: Set<number>; axis: Vector3; angle: number },
      sourceParts?: PlacedPart[],
    ) => {
      eulerToQuat(primaryFrom.rotation, _prev)
      eulerToQuat(rotation, _quat)
      _delta.copy(_quat).multiply(_prev.invert())
      _pivot.set(...primaryFrom.position)
      setParts((current) =>
        (sourceParts ?? current).map((part) => {
          if (!ids.has(part.instanceId)) {
            if (!chainedRotation?.ids.has(part.instanceId) || !isSprocket(part)) return part
            eulerToQuat(part.rotation, _quat)
            _chainRotation.setFromAxisAngle(chainedRotation.axis, chainedRotation.angle)
            _quat.premultiply(_chainRotation)
            return { ...part, rotation: quatToEuler(_quat) }
          }
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
        const ids = unionConnected(selectedIdsRef.current.length ? selectedIdsRef.current : [source.instanceId], effectiveGraph(partsRef.current))
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

  const applyPartTransform = useCallback(
    (
      id: number,
      position: [number, number, number],
      rotation: [number, number, number],
      recordHistory: boolean,
    ) => {
      const transformStart = activeTransformRef.current
      const sourceParts = transformStart?.parts ?? partsRef.current
      const current = sourceParts.find((part) => part.instanceId === id)
      if (
        !current ||
        (sameVec3(current.position, position) && sameVec3(current.rotation, rotation))
      ) {
        return
      }
      if (recordHistory) {
        if (transformStart) {
          setUndoStack((stack) => [...stack, transformStart].slice(-MAX_HISTORY))
          setRedoStack([])
        } else {
          pushHistory()
        }
      }
      const ids = unionConnected(
        selectedIdsRef.current.includes(id) ? selectedIdsRef.current : [id],
        effectiveGraph(sourceParts),
      )
      const axialRotation = isSprocket(current)
        ? sprocketAxialRotation(current, rotation)
        : null
      const chainedRotation = axialRotation
        ? {
            ids: chainedSprocketIds(chainsRef.current, id),
            axis: axialRotation.axis,
            angle: axialRotation.angle,
          }
        : undefined
      moveGroupTo(ids, current, position, rotation, chainedRotation, sourceParts)
    },
    [moveGroupTo, pushHistory],
  )

  const transformPart = useCallback(
    (id: number, position: [number, number, number], rotation: [number, number, number]) => {
      applyPartTransform(id, position, rotation, true)
    },
    [applyPartTransform],
  )

  const previewPartTransform = useCallback(
    (id: number, position: [number, number, number], rotation: [number, number, number]) => {
      applyPartTransform(id, position, rotation, false)
    },
    [applyPartTransform],
  )

  const deleteSelected = useCallback(() => {
    const ids = unionConnected(selectedIdsRef.current, effectiveGraph(partsRef.current))
    const chainId = selectedChainIdRef.current
    if (ids.size === 0 && chainId == null) return
    pushHistory()
    if (ids.size > 0) {
      setParts((current) => current.filter((part) => !ids.has(part.instanceId)))
    }
    setChains((current) =>
      current.filter(
        (chain) =>
          chain.id !== chainId &&
          !ids.has(chain.sprocketAId) &&
          !ids.has(chain.sprocketBId),
      ),
    )
    setSelectedIds([])
    setSelectedChainId(null)
    setPrimaryId(null)
  }, [pushHistory])

  const copy = useCallback(() => {
    const ids = unionConnected(selectedIdsRef.current, effectiveGraph(partsRef.current))
    if (ids.size === 0) return
    const copiedParts = partsRef.current.filter((part) => ids.has(part.instanceId))
    const indexById = new Map(copiedParts.map((part, index) => [part.instanceId, index]))
    setClipboard(
      copiedParts.map((part) => ({
        key: part.key,
        param1: part.param1,
        param2: part.param2,
        position: [...part.position] as [number, number, number],
        rotation: [...part.rotation] as [number, number, number],
        color: part.color ? [...part.color] as [number, number, number] : null,
        shape: part.shape ? clonePolycarbonateShape(part.shape) : undefined,
        groupId: part.groupId,
      })),
    )
    setClipboardChains(
      chainsRef.current.flatMap((chain) => {
        const sprocketAIndex = indexById.get(chain.sprocketAId)
        const sprocketBIndex = indexById.get(chain.sprocketBId)
        return sprocketAIndex == null || sprocketBIndex == null
          ? []
          : [{ sprocketAIndex, sprocketBIndex }]
      }),
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
    let groupId = nextGroupId(partsRef.current)
    const groupMap = new Map<number, number>()
    const remapGroup = (gid?: number) => {
      if (!gid) return undefined
      let mapped = groupMap.get(gid)
      if (!mapped) {
        mapped = groupId
        groupId += 1
        groupMap.set(gid, mapped)
      }
      return mapped
    }
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
        groupId: remapGroup(part.groupId),
      }
    })
    let chainId = nextChainId(chainsRef.current)
    const pastedChains = clipboardChains.map((chain) => ({
      id: chainId++,
      sprocketAId: pasted[chain.sprocketAIndex].instanceId,
      sprocketBId: pasted[chain.sprocketBIndex].instanceId,
    }))
    setParts((current) => [...current, ...pasted])
    setChains((current) => [...current, ...pastedChains])
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
  }, [clipboard, clipboardChains, pushHistory])

  const duplicate = useCallback(() => {
    const ids = unionConnected(selectedIdsRef.current, effectiveGraph(partsRef.current))
    if (ids.size === 0) return
    pushHistory()
    let id = nextIdRef.current
    let groupId = nextGroupId(partsRef.current)
    const groupMap = new Map<number, number>()
    const copies: PlacedPart[] = []
    const copiedIdBySource = new Map<number, number>()
    for (const part of partsRef.current) {
      if (!ids.has(part.instanceId)) continue
      let mappedGroup: number | undefined
      if (part.groupId) {
        mappedGroup = groupMap.get(part.groupId)
        if (!mappedGroup) {
          mappedGroup = groupId
          groupId += 1
          groupMap.set(part.groupId, mappedGroup)
        }
      }
      copies.push({
        ...part,
        instanceId: id,
        position: [part.position[0] + PASTE_OFFSET, part.position[1], part.position[2] + PASTE_OFFSET],
        color: part.color ? [...part.color] : null,
        groupId: mappedGroup,
      })
      copiedIdBySource.set(part.instanceId, id)
      id += 1
    }
    let chainId = nextChainId(chainsRef.current)
    const copiedChains = chainsRef.current.flatMap((chain) => {
      const sprocketAId = copiedIdBySource.get(chain.sprocketAId)
      const sprocketBId = copiedIdBySource.get(chain.sprocketBId)
      return sprocketAId == null || sprocketBId == null
        ? []
        : [{ id: chainId++, sprocketAId, sprocketBId }]
    })
    setParts((current) => [...current, ...copies])
    setChains((current) => [...current, ...copiedChains])
    setNextId(id)
    setSelectedIds(copies.map((part) => part.instanceId))
    setPrimaryId(copies[copies.length - 1]?.instanceId ?? null)
  }, [pushHistory])

  const selectedChainAction = useMemo(
    () => chainSelection(parts, selectedIds, chains),
    [chains, parts, selectedIds],
  )

  const toggleSelectedChain = useCallback(() => {
    const selection = chainSelection(partsRef.current, selectedIdsRef.current, chainsRef.current)
    if (!selection.mode) return
    const [aId, bId] = selectedIdsRef.current
    pushHistory()
    if (selection.mode === 'remove') {
      setChains((current) => current.filter((chain) => !sameChainPair(chain, aId, bId)))
      return
    }
    const id = nextChainId(chainsRef.current)
    setChains((current) => [
      ...current,
      { id, sprocketAId: aId, sprocketBId: bId },
    ])
  }, [pushHistory])

  const selectAll = useCallback(() => {
    const ids = partsRef.current.map((part) => part.instanceId)
    setSelectedIds(ids)
    setSelectedChainId(null)
    setPrimaryId(ids.at(-1) ?? null)
  }, [])

  const selectSamePartType = useCallback(() => {
    const id = primaryIdRef.current ?? selectedIdsRef.current.at(-1)
    const source = partsRef.current.find((part) => part.instanceId === id)
    if (!source) return
    const ids = partsRef.current
      .filter((part) => part.key === source.key)
      .map((part) => part.instanceId)
    setSelectedIds(ids)
    setSelectedChainId(null)
    setPrimaryId(source.instanceId)
  }, [])

  const groupSelected = useCallback(() => {
    if (selectedIdsRef.current.length < 2) return
    pushHistory()
    const groupId = nextGroupId(partsRef.current)
    const ids = new Set(selectedIdsRef.current)
    setParts((current) =>
      current.map((part) => (ids.has(part.instanceId) ? { ...part, groupId } : part)),
    )
  }, [pushHistory])

  const ungroupSelected = useCallback(() => {
    const groups = new Set(
      selectedIdsRef.current.flatMap((id) => {
        const part = partsRef.current.find((item) => item.instanceId === id)
        return part?.groupId ? [part.groupId] : []
      }),
    )
    if (groups.size === 0) return
    pushHistory()
    setParts((current) =>
      current.map((part) => (part.groupId && groups.has(part.groupId) ? { ...part, groupId: undefined } : part)),
    )
  }, [pushHistory])

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
    setChains(cloneChains(prev.chains))
    setSelectedIds([...prev.selectedIds])
    setSelectedChainId(prev.selectedChainId)
    setPrimaryId(prev.primaryId)
    setNextId(prev.nextId)
  }, [snapshot, undoStack])

  const redo = useCallback(() => {
    const next = redoStack.at(-1)
    if (!next) return
    setUndoStack((stack) => [...stack, snapshot()])
    setRedoStack((stack) => stack.slice(0, -1))
    setParts(cloneParts(next.parts))
    setChains(cloneChains(next.chains))
    setSelectedIds([...next.selectedIds])
    setSelectedChainId(next.selectedChainId)
    setPrimaryId(next.primaryId)
    setNextId(next.nextId)
  }, [redoStack, snapshot])

  const newFile = useCallback(() => {
    if (!confirmDiscard()) return
    loadParts([], [], UNTITLED_NAME, null, DEFAULT_CAMERA)
  }, [confirmDiscard, loadParts])

  const importParts = useCallback((nextParts: PlacedPart[], name: string) => {
    if (!confirmDiscard()) return false
    loadParts(nextParts, [], `${stemName(name)}.wbb`, null, camera)
    setSavedJson(serializeDocument([], DEFAULT_CAMERA, []))
    return true
  }, [camera, confirmDiscard, loadParts])

  const openFile = useCallback(async () => {
    if (!confirmDiscard()) return
    try {
      const picked = await openTextFile()
      if (!picked) return
      const parsed = parseDocument(picked.text)
      loadParts(parsed.parts, parsed.chains, picked.name, picked.handle, parsed.camera)
    } catch (error) {
      if (isAbortError(error)) return
      window.alert(explainError(error, 'Could not open that file.'))
    }
  }, [confirmDiscard, loadParts])

  const saveToHandle = useCallback(
    async (handle: FileSystemFileHandle | null) => {
      const toSave = cloneParts(partsRef.current)
      const chainsToSave = cloneChains(chainsRef.current)
      try {
        const saved = await saveTextFile({
          text: serializeDocument(toSave, camera, chainsToSave),
          suggestedName: withWbbExtension(fileName),
          handle,
        })
        if (!saved) return
        fileHandle.current = saved.handle
        setFileName(withWbbExtension(saved.name))
        markSaved(toSave, chainsToSave, camera)
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
    const next = `${name.trim().replace(/\.wbb$/i, '') || 'untitled'}.wbb`
    setFileName(next)
  }, [])

  const onMoveStart = useCallback(() => {
    ignorePointerMiss.current = true
    activeTransformRef.current = snapshot()
  }, [snapshot])

  const onMoveEnd = useCallback(() => {
    activeTransformRef.current = null
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

  useLayoutEffect(() => {
    commandsRef.current = {
      hasSelection: selectedIds.length > 0,
    canDelete: selectedIds.length > 0 || selectedChainId != null,
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
    groupSelected,
    ungroupSelected,
    stopPlacing,
    startMoveSelection,
    setTool: chooseTool,
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
  })

  useEditorHotkeys(hotkeys, commandsRef, setFlipHole, setRotatingPlacement, dirty)

  return {
    parts,
    chains,
    selectedIds,
    primaryId,
    primary,
    selectedChainId,
    selectedChainLinkCount,
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
    setOrtho: (next: boolean) => {
      setOrtho(next)
      setCamera((current) => ({ ...current, ortho: next }))
    },
    camera,
    setCamera: (next: CameraState) => {
      setCamera((current) => {
        if (
          current.ortho === next.ortho &&
          sameVec3(current.position, next.position) &&
          sameVec3(current.target, next.target)
        ) {
          return current
        }
        return next
      })
    },
    startPlacing,
    updatePlacing,
    updatePlacingRotation,
    stopPlacing,
    startMoveSelection,
    placeAt,
    transformPart,
    previewPartTransform,
    selectChain,
    updatePartShape,
    selectedChainAction,
    toggleSelectedChain,
    selectPart,
    onMoveStart,
    onMoveEnd,
    onPointerMissed,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    hasSelection: selectedIds.length > 0,
    canDelete: selectedIds.length > 0 || selectedChainId != null,
    canPaste: clipboard.length > 0,
    newFile,
    openFile,
    importParts,
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
    selectSamePartType,
    groupSelected,
    ungroupSelected,
    canGroup: selectedIds.length > 1,
    canUngroup: parts.some((part) => selectedIds.includes(part.instanceId) && part.groupId),
    deleteSelected,
  }
}
