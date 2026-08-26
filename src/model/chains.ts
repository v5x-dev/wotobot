import { Quaternion, Vector3 } from 'three'
import { eulerToQuat } from './math'
import { findPart, type PlacedPart } from './parts'

export type SprocketChain = {
  id: number
  sprocketAId: number
  sprocketBId: number
}

export type ChainGeometry = {
  axis: [number, number, number]
  points: [number, number, number][]
  pitch: number
  kind: ChainKind
}

export type ChainKind = 'standard' | '6p' | 'high-strength'

export const STANDARD_CHAIN_PITCH = 0.148
export const SIX_P_CHAIN_PITCH = 0.25
export const HIGH_STRENGTH_CHAIN_PITCH = 0.385
const MAX_AXIS_ANGLE = Math.PI / 90
const MAX_PLANE_OFFSET = 0.0625
const MIN_CENTER_GAP = 0.02
const SIX_P_SPROCKET_TEETH = new Set(['8T', '16T', '32T'])

const _axisA = new Vector3()
const _axisB = new Vector3()
const _centerA = new Vector3()
const _centerB = new Vector3()
const _delta = new Vector3()
const _xAxis = new Vector3()
const _yAxis = new Vector3()
const _point = new Vector3()
const _quat = new Quaternion()

export function isSprocket(part: PlacedPart | undefined): part is PlacedPart {
  return Boolean(part && findPart(part.key)?.id === 'SPKT')
}

export function sprocketTeeth(part: PlacedPart) {
  const match = part.param2.match(/\d+/)
  return Math.max(3, Number(match?.[0]) || 10)
}

export function sprocketPitchRadius(part: PlacedPart) {
  return sprocketChainPitch(part) / (2 * Math.sin(Math.PI / sprocketTeeth(part)))
}

export function sprocketChainPitch(part: PlacedPart) {
  const kind = sprocketChainKind(part)
  if (kind === 'high-strength') return HIGH_STRENGTH_CHAIN_PITCH
  if (kind === '6p') return SIX_P_CHAIN_PITCH
  return STANDARD_CHAIN_PITCH
}

export function sprocketChainKind(part: PlacedPart): ChainKind {
  if (part.param1 === 'High Strength') return 'high-strength'
  return SIX_P_SPROCKET_TEETH.has(part.param2) ? '6p' : 'standard'
}

export function sprocketRotationPhase(part: PlacedPart) {
  const rotation = eulerToQuat(part.rotation, new Quaternion())
  const localZ = new Vector3(0, 0, 1)
  const axis = localZ.clone().applyQuaternion(rotation).normalize()
  const axisAlignment = new Quaternion().setFromUnitVectors(localZ, axis)
  const roll = axisAlignment.invert().multiply(rotation).normalize()
  let angle = 2 * Math.atan2(roll.z, roll.w)
  if (angle > Math.PI) angle -= Math.PI * 2
  if (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

export function nextChainId(chains: SprocketChain[]) {
  return chains.reduce((max, chain) => Math.max(max, chain.id), 0) + 1
}

export function sameChainPair(chain: SprocketChain, aId: number, bId: number) {
  return (
    (chain.sprocketAId === aId && chain.sprocketBId === bId) ||
    (chain.sprocketAId === bId && chain.sprocketBId === aId)
  )
}

export function chainedSprocketIds(chains: SprocketChain[], sprocketId: number) {
  const connected = new Set<number>([sprocketId])
  const pending = [sprocketId]

  while (pending.length > 0) {
    const current = pending.pop()!
    for (const chain of chains) {
      let next: number | null = null
      if (chain.sprocketAId === current) next = chain.sprocketBId
      else if (chain.sprocketBId === current) next = chain.sprocketAId
      if (next == null || connected.has(next)) continue
      connected.add(next)
      pending.push(next)
    }
  }

  return connected
}

export function chainSelection(
  parts: PlacedPart[],
  selectedIds: number[],
  chains: SprocketChain[],
) {
  if (selectedIds.length !== 2) {
    return { mode: null, reason: 'Select two sprockets to add a chain.' } as const
  }
  const [aId, bId] = selectedIds
  const a = parts.find((part) => part.instanceId === aId)
  const b = parts.find((part) => part.instanceId === bId)
  if (!isSprocket(a) || !isSprocket(b)) {
    return { mode: null, reason: 'Both selected parts must be sprockets.' } as const
  }
  const existing = chains.find((chain) => sameChainPair(chain, aId, bId))
  if (existing) {
    return { mode: 'remove', reason: 'Remove chain from the selected sprockets.' } as const
  }
  const error = chainFitError(a, b)
  if (error) return { mode: null, reason: error } as const
  const kind = sprocketChainKind(a)
  const label = kind === 'high-strength' ? 'high-strength' : kind === '6p' ? '6P' : 'standard'
  return { mode: 'add', reason: `Add ${label} chain between the selected sprockets.` } as const
}

export function chainFitError(a: PlacedPart, b: PlacedPart) {
  if (sprocketChainKind(a) !== sprocketChainKind(b)) {
    return 'The sprockets must use the same chain type.'
  }
  sprocketAxis(a, _axisA)
  sprocketAxis(b, _axisB)
  const alignment = Math.min(1, Math.abs(_axisA.dot(_axisB)))
  if (Math.acos(alignment) > MAX_AXIS_ANGLE) {
    return 'The sprockets must be parallel.'
  }

  _centerA.set(...a.position)
  _centerB.set(...b.position)
  _delta.copy(_centerB).sub(_centerA)
  const planeOffset = Math.abs(_delta.dot(_axisA))
  if (planeOffset > MAX_PLANE_OFFSET) {
    return 'The sprockets must be in the same plane.'
  }
  _delta.addScaledVector(_axisA, -_delta.dot(_axisA))
  const distance = _delta.length()
  if (distance <= Math.abs(sprocketPitchRadius(a) - sprocketPitchRadius(b)) + MIN_CENTER_GAP) {
    return 'Move the sprockets farther apart.'
  }
  return null
}

function sprocketAxis(part: PlacedPart, target: Vector3) {
  eulerToQuat(part.rotation, _quat)
  return target.set(0, 0, 1).applyQuaternion(_quat).normalize()
}

function addPoint(
  points: [number, number, number][],
  center: Vector3,
  xAxis: Vector3,
  yAxis: Vector3,
  x: number,
  y: number,
) {
  _point.copy(center).addScaledVector(xAxis, x).addScaledVector(yAxis, y)
  points.push([_point.x, _point.y, _point.z])
}

function arcSteps(radius: number, sweep: number, pitch: number) {
  return Math.max(6, Math.ceil((radius * Math.abs(sweep)) / (pitch / 3)))
}

/** Builds the open-chain tangent path in the sprockets' shared local plane. */
export function chainGeometry(a: PlacedPart, b: PlacedPart): ChainGeometry | null {
  if (!isSprocket(a) || !isSprocket(b)) return null
  if (chainFitError(a, b)) return null

  sprocketAxis(a, _axisA)
  sprocketAxis(b, _axisB)
  if (_axisA.dot(_axisB) < 0) _axisB.negate()
  _axisA.add(_axisB)
  if (_axisA.lengthSq() < 1e-8) sprocketAxis(a, _axisA)
  else _axisA.normalize()

  _centerA.set(...a.position)
  _centerB.set(...b.position)
  _delta.copy(_centerB).sub(_centerA)
  const planeOffset = _delta.dot(_axisA)
  _centerA.addScaledVector(_axisA, planeOffset / 2)
  _centerB.addScaledVector(_axisA, -planeOffset / 2)
  _delta.copy(_centerB).sub(_centerA)
  _delta.addScaledVector(_axisA, -_delta.dot(_axisA))
  const distance = _delta.length()
  const radiusA = sprocketPitchRadius(a)
  const radiusB = sprocketPitchRadius(b)
  const pitch = sprocketChainPitch(a)
  const kind = sprocketChainKind(a)
  if (distance <= Math.abs(radiusA - radiusB) + MIN_CENTER_GAP) return null

  _xAxis.copy(_delta).normalize()
  _yAxis.copy(_axisA).cross(_xAxis).normalize()
  const normalX = (radiusA - radiusB) / distance
  const normalY = Math.sqrt(Math.max(0, 1 - normalX * normalX))
  const tangentAngle = Math.atan2(normalY, normalX)
  const points: [number, number, number][] = []

  addPoint(points, _centerA, _xAxis, _yAxis, radiusA * normalX, radiusA * normalY)
  addPoint(points, _centerB, _xAxis, _yAxis, radiusB * normalX, radiusB * normalY)

  const bSteps = arcSteps(radiusB, 2 * tangentAngle, pitch)
  for (let index = 1; index <= bSteps; index += 1) {
    const angle = tangentAngle - (2 * tangentAngle * index) / bSteps
    addPoint(
      points,
      _centerB,
      _xAxis,
      _yAxis,
      radiusB * Math.cos(angle),
      radiusB * Math.sin(angle),
    )
  }

  addPoint(points, _centerA, _xAxis, _yAxis, radiusA * normalX, -radiusA * normalY)
  const aSweep = Math.PI * 2 - 2 * tangentAngle
  const aSteps = arcSteps(radiusA, aSweep, pitch)
  for (let index = 1; index < aSteps; index += 1) {
    const angle = -tangentAngle - (aSweep * index) / aSteps
    addPoint(
      points,
      _centerA,
      _xAxis,
      _yAxis,
      radiusA * Math.cos(angle),
      radiusA * Math.sin(angle),
    )
  }

  return {
    axis: [_axisA.x, _axisA.y, _axisA.z],
    points,
    pitch,
    kind,
  }
}

export function resampleClosedPath(
  points: [number, number, number][],
  spacing: number,
  offset = 0,
) {
  if (points.length < 2) return points
  const vectors = points.map((point) => new Vector3(...point))
  const cumulative = [0]
  for (let index = 0; index < vectors.length; index += 1) {
    const next = vectors[(index + 1) % vectors.length]
    cumulative.push(cumulative[index] + vectors[index].distanceTo(next))
  }
  const total = cumulative.at(-1) ?? 0
  const count = Math.max(4, Math.round(total / spacing))
  const actualSpacing = total / count
  const result: [number, number, number][] = []
  for (let index = 0; index < count; index += 1) {
    const distance = ((index * actualSpacing + offset) % total + total) % total
    let segment = 0
    while (segment + 1 < cumulative.length && cumulative[segment + 1] < distance) segment += 1
    const start = vectors[segment % vectors.length]
    const end = vectors[(segment + 1) % vectors.length]
    const span = cumulative[segment + 1] - cumulative[segment]
    const t = span > 0 ? (distance - cumulative[segment]) / span : 0
    _point.copy(start).lerp(end, t)
    result.push([_point.x, _point.y, _point.z])
  }
  return result
}

export function chainLinkCount(a: PlacedPart, b: PlacedPart) {
  const geometry = chainGeometry(a, b)
  if (!geometry) return 0
  return resampleClosedPath(geometry.points, geometry.pitch).length
}
