import { PARTS } from './partsCatalog'
import type { ChannelProfile } from './channelGeometry'
import { isChannelProfile } from './channelGeometry'

export const PART_GROUPS = [
  'Structure',
  'Motion',
  'Electronics',
  'Pneumatics',
  'Competition',
] as const

export type PartGroup = (typeof PART_GROUPS)[number]

export type PartParam = {
  name: string
  defaultValue: string
  custom: boolean
  unit: string
  customDefault: string
  min: number
  max: number
  options: string[]
}

export type PartVariant = {
  param1: string
  param2: string
  meshName: string
  fbx: string | null
}

export type PartMesh = {
  meshName: string
  fbx: string | null
  splitFbx?: string | null
}

export type PartGenerator = 'aluminum' | 'child' | 'single' | 'plate' | 'shaft' | 'polycarbonate'

export type PolycarbonateShape = {
  kind: 'polygon'
  thickness: number
  points: [number, number][]
  holes: [number, number][]
}

export function rectanglePolygon(width: number, height: number): [number, number][] {
  return [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]]
}

export function polygonAabb(points: [number, number][]) {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

export function polygonSize(points: [number, number][]) {
  const { width, height } = polygonAabb(points)
  return { width, height }
}

export function polygonCenter(points: [number, number][]): [number, number] {
  const { minX, maxX, minY, maxY } = polygonAabb(points)
  return [(minX + maxX) / 2, (minY + maxY) / 2]
}

export function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function clonePolycarbonateShape(shape: PolycarbonateShape): PolycarbonateShape {
  return {
    kind: 'polygon',
    thickness: shape.thickness,
    points: shape.points.map(([x, y]) => [x, y]),
    holes: (shape.holes ?? []).map(([x, y]) => [x, y]),
  }
}

export function defaultPolycarbonateShape(width: number, height: number, thickness = 0.0625): PolycarbonateShape {
  return {
    kind: 'polygon',
    thickness,
    points: rectanglePolygon(width, height),
    holes: [],
  }
}

export type PartDefinition = {
  id: string
  name: string
  group: PartGroup
  unityGroup: string
  connectingPart: boolean
  generator: PartGenerator
  icon: string | null
  param1: PartParam | null
  param2: PartParam | null
  variants: PartVariant[]
  mesh: PartMesh | null
}

export type PlacedPart = {
  instanceId: number
  key: string
  onshapeName?: string
  param1: string
  param2: string
  position: [number, number, number]
  rotation: [number, number, number]
  color: [number, number, number] | null
  shape?: PolycarbonateShape
  groupId?: number
}

export function nextGroupId(parts: PlacedPart[]) {
  return parts.reduce((max, part) => Math.max(max, part.groupId ?? 0), 0) + 1
}

export const ZERO_ROTATION: [number, number, number] = [0, 0, 0]

export function partKey(part: PartDefinition) {
  return `${part.group}:${part.id}:${part.name}`
}

export function findPart(key: string) {
  return PARTS.find((part) => partKey(part) === key)
}

export function polycarbonateOutline(part: Pick<PlacedPart, 'param1' | 'param2' | 'shape'>): [number, number][] {
  if (part.shape?.points && part.shape.points.length >= 3) return part.shape.points
  return rectanglePolygon(Number(part.param1) || 4, Number(part.param2) || 8)
}

export function defaultParamValue(param: PartParam | null) {
  if (!param) return ''
  if (param.custom) return param.defaultValue || param.customDefault || String(param.min || 1)
  return param.defaultValue || param.options[0] || ''
}

export function paramError(param: PartParam | null, value: string) {
  if (!param?.custom) return null
  const number = Number(value)
  if (!Number.isFinite(number)) return `${param.name} must be a number.`
  if (number < param.min || number > param.max) {
    const unit = param.unit ? ` ${param.unit.toLowerCase()}` : ''
    return `${param.name} must be ${param.min}–${param.max}${unit}.`
  }
  return null
}

export function param2Options(part: PartDefinition, param1: string) {
  if (!part.param2) return []
  const fromVariants = [
    ...new Set(
      part.variants
        .filter((variant) => !param1 || variant.param1 === param1)
        .map((variant) => variant.param2)
        .filter(Boolean),
    ),
  ]
  if (fromVariants.length > 0) return fromVariants
  return part.param2.options
}

export function variantFor(part: PartDefinition, param1: string, param2: string) {
  const exact = part.variants.find(
    (variant) => variant.param1 === param1 && (!variant.param2 || variant.param2 === param2),
  )
  if (exact) return exact
  return part.variants.find((variant) => variant.param1 === param1) ?? part.variants[0]
}

export function channelProfileFromSize(size: string): ChannelProfile {
  const width = Number(size.split('x').at(-1))
  return isChannelProfile(width) ? width : 2
}

export function modelUrl(fbx: string) {
  return `/protobot-models/${fbx.split('/').map(encodeURIComponent).join('/')}`
}

export function matchesSearch(part: PartDefinition, search: string) {
  if (!search) return true
  const needle = search.toLowerCase()
  const haystack = part.name.toLowerCase()
  return haystack.includes(needle) || needle.includes(haystack)
}
