import { findPart, polygonSize, type PlacedPart } from './parts'

export const MAX_POLYCARBONATE_PIECES = 12
export const MAX_FOOTPRINT_SHORT = 4
export const MAX_FOOTPRINT_LONG = 8
export const MAX_TOTAL_AREA = MAX_FOOTPRINT_SHORT * MAX_FOOTPRINT_LONG
export const MAX_THICKNESS = 0.07
export const DEFAULT_THICKNESS = 0.0625

const SIZE_EPSILON = 1e-4

export type PolycarbonatePieceStatus = {
  instanceId: number
  index: number
  width: number
  height: number
  thickness: number
  area: number
  overFootprint: boolean
  overThickness: boolean
  over: boolean
}

export type PolycarbonateStatus = {
  count: number
  totalArea: number
  overCount: boolean
  overArea: boolean
  pieces: PolycarbonatePieceStatus[]
  over: boolean
}

function isPolycarbonate(part: PlacedPart) {
  if (findPart(part.key)?.generator === 'polycarbonate') return true
  return part.key.split(':')[1] === 'POLY'
}

function outlineSize(part: PlacedPart) {
  if (part.shape?.points && part.shape.points.length > 0) {
    return polygonSize(part.shape.points)
  }
  return {
    width: Number(part.param1) || 4,
    height: Number(part.param2) || 8,
  }
}

function polygonArea(points: [number, number][]) {
  return Math.abs(points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length]
    return sum + x * nextY - nextX * y
  }, 0)) / 2
}

function pieceArea(part: PlacedPart, width: number, height: number) {
  if (part.shape?.points && part.shape.points.length >= 3) {
    return polygonArea(part.shape.points)
  }
  return width * height
}

function fitsFootprint(width: number, height: number) {
  const short = Math.min(width, height)
  const long = Math.max(width, height)
  return short <= MAX_FOOTPRINT_SHORT + SIZE_EPSILON && long <= MAX_FOOTPRINT_LONG + SIZE_EPSILON
}

export function formatInches(value: number) {
  return String(Number(value.toFixed(3)))
}

function pieceStatus(part: PlacedPart, index: number): PolycarbonatePieceStatus {
  const { width, height } = outlineSize(part)
  const thickness = part.shape?.thickness ?? DEFAULT_THICKNESS
  const area = pieceArea(part, width, height)
  const overFootprint = !fitsFootprint(width, height)
  const overThickness = thickness > MAX_THICKNESS + SIZE_EPSILON
  return {
    instanceId: part.instanceId,
    index,
    width,
    height,
    thickness,
    area,
    overFootprint,
    overThickness,
    over: overFootprint || overThickness,
  }
}

export function polycarbonatePieceStatus(part: PlacedPart, index = 1): PolycarbonatePieceStatus | null {
  if (!isPolycarbonate(part)) return null
  return pieceStatus(part, index)
}

export function evaluatePolycarbonate(parts: PlacedPart[]): PolycarbonateStatus {
  const pieces = parts.filter(isPolycarbonate).map((part, index) => pieceStatus(part, index + 1))
  const count = pieces.length
  const totalArea = pieces.reduce((sum, piece) => sum + piece.area, 0)
  const overCount = count > MAX_POLYCARBONATE_PIECES
  const overArea = totalArea > MAX_TOTAL_AREA + SIZE_EPSILON
  return {
    count,
    totalArea,
    overCount,
    overArea,
    pieces,
    over: overCount || overArea || pieces.some((piece) => piece.over),
  }
}

export function polycarbonateBudgetReasons(status: PolycarbonateStatus) {
  const reasons: string[] = []
  if (status.overCount) {
    reasons.push(`${status.count} pieces (max ${MAX_POLYCARBONATE_PIECES})`)
  }
  if (status.overArea) {
    reasons.push(`${formatInches(status.totalArea)} in² used (max ${MAX_TOTAL_AREA} in²)`)
  }
  return reasons
}

export function polycarbonateLimitReasons(status: PolycarbonateStatus) {
  const reasons = polycarbonateBudgetReasons(status)
  for (const piece of status.pieces) {
    if (piece.overFootprint) {
      reasons.push(
        `piece ${piece.index} is ${formatInches(piece.width)}×${formatInches(piece.height)} (max ${MAX_FOOTPRINT_SHORT}×${MAX_FOOTPRINT_LONG})`,
      )
    }
    if (piece.overThickness) {
      reasons.push(
        `piece ${piece.index} is ${formatInches(piece.thickness)} in thick (max ${formatInches(MAX_THICKNESS)})`,
      )
    }
  }
  return reasons
}

export function pieceLimitReasons(piece: PolycarbonatePieceStatus) {
  const reasons: string[] = []
  if (piece.overFootprint) {
    reasons.push(
      `Footprint ${formatInches(piece.width)}×${formatInches(piece.height)} exceeds ${MAX_FOOTPRINT_SHORT}×${MAX_FOOTPRINT_LONG}.`,
    )
  }
  if (piece.overThickness) {
    reasons.push(`Thickness ${formatInches(piece.thickness)} in exceeds ${formatInches(MAX_THICKNESS)} in.`)
  }
  return reasons
}
