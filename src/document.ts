import { ZERO_ROTATION, type PlacedPart } from './parts'
import { partsListText as formatPartsList } from './weight'

export type { PlacedPart }

export const DOCUMENT_VERSION = 2
export const UNTITLED_NAME = 'untitled.wbb'
export const PASTE_OFFSET = 1

export type CameraState = {
  target: [number, number, number]
  position: [number, number, number]
  ortho: boolean
}

export const DEFAULT_CAMERA: CameraState = {
  target: [0, 0, 0],
  position: [7.925, -7.5, 10.62],
  ortho: false,
}

export type RobotDocument = {
  version: number
  parts: PlacedPart[]
  camera?: CameraState
}

function cloneVec3(value: [number, number, number]): [number, number, number] {
  return [value[0], value[1], value[2]]
}

export function cloneParts(parts: PlacedPart[]): PlacedPart[] {
  return parts.map((part) => ({
    ...part,
    position: cloneVec3(part.position),
    rotation: cloneVec3(part.rotation ?? ZERO_ROTATION),
    color: part.color ? cloneVec3(part.color) : null,
  }))
}

export function nextInstanceId(parts: PlacedPart[]) {
  return parts.reduce((max, part) => Math.max(max, part.instanceId), 0) + 1
}

export function serializeDocument(parts: PlacedPart[], camera: CameraState = DEFAULT_CAMERA) {
  const document: RobotDocument = {
    version: DOCUMENT_VERSION,
    parts: cloneParts(parts),
    camera: {
      target: cloneVec3(camera.target),
      position: cloneVec3(camera.position),
      ortho: camera.ortho,
    },
  }
  return `${JSON.stringify(document, null, 2)}\n`
}

function asVec3(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null
  const [x, y, z] = value
  if (![x, y, z].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  return [x, y, z]
}

function asColor(value: unknown): [number, number, number] | null {
  if (value == null) return null
  return asVec3(value)
}

function asPart(value: unknown): PlacedPart | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const position = asVec3(record.position)
  const rotation =
    record.rotation === undefined ? cloneVec3(ZERO_ROTATION) : asVec3(record.rotation)
  if (
    typeof record.instanceId !== 'number' ||
    !Number.isInteger(record.instanceId) ||
    typeof record.key !== 'string' ||
    typeof record.param1 !== 'string' ||
    typeof record.param2 !== 'string' ||
    !position ||
    !rotation
  ) {
    return null
  }
  return {
    instanceId: record.instanceId,
    key: record.key,
    param1: record.param1,
    param2: record.param2,
    position,
    rotation,
    color: asColor(record.color),
  }
}

function asCamera(value: unknown): CameraState | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const target = asVec3(record.target)
  const position = asVec3(record.position)
  if (!target || !position || typeof record.ortho !== 'boolean') return null
  return { target, position, ortho: record.ortho }
}

export function parseDocument(text: string): { parts: PlacedPart[]; camera: CameraState } {
  const data: unknown = JSON.parse(text)
  const rawParts = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as RobotDocument).parts)
      ? (data as RobotDocument).parts
      : null
  if (!rawParts) throw new Error('That file is not a Protobot document.')

  const parts: PlacedPart[] = []
  const usedIds = new Set<number>()
  for (const item of rawParts) {
    const part = asPart(item)
    if (!part) throw new Error('That file contains an invalid part.')
    if (usedIds.has(part.instanceId)) throw new Error('That file contains duplicate part ids.')
    usedIds.add(part.instanceId)
    parts.push(part)
  }

  const camera =
    data && typeof data === 'object' ? asCamera((data as RobotDocument).camera) : null
  return { parts, camera: camera ?? DEFAULT_CAMERA }
}

export function withWbbExtension(name: string) {
  return /\.(wbb|json)$/i.test(name) ? name : `${name}.wbb`
}

export function stemName(name: string) {
  return name.replace(/\.(wbb|json)$/i, '') || 'untitled'
}

export function partsListText(parts: PlacedPart[]) {
  return formatPartsList(parts)
}
