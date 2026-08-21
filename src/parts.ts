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

export type PartGenerator = 'aluminum' | 'child' | 'single' | 'plate' | 'shaft'

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
  param1: string
  param2: string
  position: [number, number, number]
  rotation: [number, number, number]
  color: [number, number, number] | null
}

export const ZERO_ROTATION: [number, number, number] = [0, 0, 0]

export function partKey(part: PartDefinition) {
  return `${part.group}:${part.id}:${part.name}`
}

export function findPart(key: string) {
  return PARTS.find((part) => partKey(part) === key)
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
