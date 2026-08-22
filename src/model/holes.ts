import { holeX } from './channelGeometry'
import { HOLES_CATALOG } from './holesCatalog'
import {
  findPart,
  pointInPolygon,
  polycarbonateOutline,
  polygonCenter,
  type PlacedPart,
} from './parts'

export const SCREW_HOLE_DIAMETER = 0.182
export const SCREW_HOLE_SPACING = 0.5

export type HoleType = 'normal' | 'threaded' | 'clamp'
export type HoleShape = 'circle' | 'square'

export type HoleTemplate = {
  position: [number, number, number]
  rotation: [number, number, number, number]
  size: [number, number]
  depth: number
  type: HoleType
  twoSided: boolean
  shape: HoleShape
}

type VariantHoles = {
  holes: HoleTemplate[]
  primaryHoleDepth: number | null
  allowCenterInserts: boolean
}

type AluminumRoles = {
  start?: HoleTemplate[]
  mid?: HoleTemplate[]
  mid5Start?: HoleTemplate[]
  mid5End?: HoleTemplate[]
  end?: HoleTemplate[]
}

type CatalogEntry = {
  id: string
  group?: string
  generator: string
  aluminum: Record<string, AluminumRoles> | null
  plate: HoleTemplate | null
  variants: Record<string, VariantHoles> | null
  shaft: { holes: HoleTemplate[] } | null
  single: { holes: HoleTemplate[] } | null
  primaryHoleDepth: number | null
  allowCenterInserts: boolean
  motorHoles: HoleTemplate[] | null
}

const CATALOG = HOLES_CATALOG as unknown as Record<string, CatalogEntry>
const MAX_ALUMINUM_HOLES = 35

function catalogEntry(part: PlacedPart) {
  const definition = findPart(part.key)
  if (!definition) return undefined
  return CATALOG[`${definition.group}:${definition.id}`] ?? CATALOG[definition.id]
}

function platePos(value: number, max: number) {
  return 0.5 * ((-max + 1) / 2 + value)
}

function aluminumRole(hole: number): keyof AluminumRoles {
  if (hole === 1) return 'start'
  if (hole === MAX_ALUMINUM_HOLES) return 'end'
  if (hole % 5 === 0) return 'mid5Start'
  if ((hole - 1) % 5 === 0) return 'mid5End'
  return 'mid'
}

function variantKey(param1: string, param2: string) {
  return `${param1}|${param2}`
}

function variantEntry(entry: CatalogEntry, param1: string, param2: string) {
  if (!entry.variants) return null
  return (
    entry.variants[variantKey(param1, param2)] ??
    entry.variants[variantKey(param1, '')] ??
    entry.variants[Object.keys(entry.variants).find((key) => key.startsWith(`${param1}|`)) ?? ''] ??
    null
  )
}

function polycarbonateHoles(part: PlacedPart): HoleTemplate[] {
  const points = polycarbonateOutline(part)
  const thickness = part.shape?.thickness ?? 0.0625
  const [cx, cy] = polygonCenter(points)
  const holes: HoleTemplate[] = []
  for (const [x, y] of part.shape?.holes ?? []) {
    if (!pointInPolygon([x, y], points)) continue
    holes.push({
      position: [x - cx, y - cy, 0],
      rotation: [0, 0, 0, 1],
      size: [SCREW_HOLE_DIAMETER, SCREW_HOLE_DIAMETER],
      depth: thickness,
      type: 'normal',
      twoSided: true,
      shape: 'circle',
    })
  }
  return holes
}

export function holesForPart(part: PlacedPart): HoleTemplate[] {
  if (findPart(part.key)?.generator === 'polycarbonate') return polycarbonateHoles(part)

  const entry = catalogEntry(part)
  if (!entry) return []

  if (entry.aluminum) {
    const roles = entry.aluminum[part.param1] ?? Object.values(entry.aluminum)[0]
    if (!roles) return []
    const holeCount = Math.max(1, Math.min(MAX_ALUMINUM_HOLES, Number(part.param2) || 5))
    const holes: HoleTemplate[] = []
    for (let index = 0; index < holeCount; index += 1) {
      const templates = roles[aluminumRole(index + 1)] ?? roles.mid ?? []
      const offsetX = holeX(index, holeCount)
      for (const template of templates) {
        holes.push({
          ...template,
          position: [template.position[0] + offsetX, template.position[1], template.position[2]],
        })
      }
    }
    return holes
  }

  if (entry.plate) {
    const length = Math.max(1, Number(part.param1) || 5)
    const width = Math.max(1, Number(part.param2) || 5)
    const holes: HoleTemplate[] = []
    for (let x = 0; x < length; x += 1) {
      for (let y = 0; y < width; y += 1) {
        holes.push({
          ...entry.plate,
          position: [
            platePos(x, length) + entry.plate.position[0],
            platePos(y, width) + entry.plate.position[1],
            entry.plate.position[2],
          ],
        })
      }
    }
    return holes
  }

  const variant = variantEntry(entry, part.param1, part.param2)
  if (variant) return variant.holes
  if (entry.single) return entry.single.holes
  if (entry.shaft) return entry.shaft.holes
  return []
}

export function primaryHoleDepthFor(part: PlacedPart) {
  if (findPart(part.key)?.generator === 'polycarbonate') {
    return part.shape?.thickness ?? 0.0625
  }
  const entry = catalogEntry(part)
  if (!entry) return 0.06
  const variant = variantEntry(entry, part.param1, part.param2)
  return variant?.primaryHoleDepth ?? entry.primaryHoleDepth ?? entry.plate?.depth ?? 0.06
}

export function allowsCenterInserts(part: PlacedPart) {
  const entry = catalogEntry(part)
  if (!entry) return false
  const variant = variantEntry(entry, part.param1, part.param2)
  return variant?.allowCenterInserts ?? entry.allowCenterInserts
}

export function isHighStrengthHole(hole: HoleTemplate) {
  return hole.shape === 'square' && Math.abs(hole.size[0] - 0.25) < 1e-3 && Math.abs(hole.size[1] - 0.25) < 1e-3
}

export function motorHolesFor(part: PlacedPart) {
  return catalogEntry(part)?.motorHoles ?? []
}
