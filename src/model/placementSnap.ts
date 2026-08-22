import { Quaternion, Vector3 } from 'three'
import type { WorldHole } from './connections'
import { allowsCenterInserts, isHighStrengthHole, primaryHoleDepthFor } from './holes'
import { eulerToQuat, lookRotation, quatToEuler, type Vec3 } from './math'
import { findPart, type PlacedPart } from './parts'

export type HoleFace = {
  hole: WorldHole
  direction: Vector3
  position: Vector3
  lookRotation: Quaternion
}

export type SnapResult = {
  position: Vec3
  rotation: Vec3
  modifyRotation: boolean
}

const SHAFT_SNAP_RANGE = 0.325
const INSERT_OFFSET = 0.05
const STANDOFF_IDS = new Set(['SNDF', 'SPCR', 'PSPC', 'BRNG', 'WSHR'])
const _up = new Vector3(0, 1, 0)
const _forward = new Vector3()
const _quat = new Quaternion()

export function holeFaceFromHit(hole: WorldHole, hitNormal: Vector3, flip: boolean): HoleFace {
  let direction = hole.worldForward.clone()
  if (direction.dot(hitNormal) < 0) direction.negate()
  if (flip) direction.negate()
  const position = hole.worldPosition.clone().addScaledVector(direction, hole.depth / 2)
  const holeUp = new Vector3(0, 1, 0)
  lookRotation(hole.worldForward, _up, _quat)
  holeUp.applyQuaternion(_quat)
  const faceQuat = lookRotation(direction, holeUp, new Quaternion())
  return { hole, direction, position, lookRotation: faceQuat }
}

function displacement(position: Vector3, rotation: Quaternion): SnapResult {
  return {
    position: [position.x, position.y, position.z],
    rotation: quatToEuler(rotation),
    modifyRotation: true,
  }
}

function objectId(part: Pick<PlacedPart, 'key' | 'param1' | 'param2'>) {
  const definition = findPart(part.key)
  if (!definition) return ''
  return [definition.id, part.param1, part.param2].filter(Boolean).join('-')
}

export function snapPlacement(args: {
  pending: Pick<PlacedPart, 'key' | 'param1' | 'param2'>
  holeFace: HoleFace | null
  hoverPart: PlacedPart | null
  hoverPoint: Vector3 | null
  groundPoint: Vec3
  currentRotation: Vec3
  flip: boolean
}): SnapResult {
  const pendingId = objectId(args.pending)
  const definition = findPart(args.pending.key)
  const ground: SnapResult = {
    position: args.groundPoint,
    rotation: args.currentRotation,
    modifyRotation: false,
  }
  const pendingAsPart = args.pending as PlacedPart

  const hoverDefinition = args.hoverPart ? findPart(args.hoverPart.key) : null
  if (hoverDefinition?.id === 'SHFT' && args.hoverPart && args.hoverPoint) {
    eulerToQuat(args.hoverPart.rotation, _quat)
    _forward.set(0, 0, 1).applyQuaternion(_quat).normalize()
    const origin = new Vector3(...args.hoverPart.position)
    const t = args.hoverPoint.clone().sub(origin).dot(_forward)
    const shaftPoint = origin.clone().addScaledVector(_forward, t)
    const extra = allowsCenterInserts(pendingAsPart) && !args.hoverPart.param1.includes('High') ? INSERT_OFFSET : 0
    const offset = primaryHoleDepthFor(pendingAsPart) / 2 + extra
    const rotation = lookRotation(args.flip ? _forward.clone().negate() : _forward.clone(), _up, new Quaternion())
    if (args.holeFace && args.holeFace.position.distanceTo(shaftPoint) < SHAFT_SNAP_RANGE) {
      const along = _forward.clone().multiplyScalar(offset)
      const pos =
        args.holeFace.position.clone().dot(_forward) > origin.dot(_forward)
          ? args.holeFace.position.clone().sub(along)
          : args.holeFace.position.clone().add(along)
      return displacement(pos, pendingId.includes('Hole') ? lookRotation(args.holeFace.direction, _up, new Quaternion()) : rotation)
    }
    if (offset > 0 || pendingId.includes('Hole')) return displacement(shaftPoint, rotation)
  }

  if (args.holeFace) {
    if (pendingId.includes('SCRW') || pendingId.includes('RBMP')) {
      return displacement(args.holeFace.position, args.holeFace.lookRotation)
    }
    if (pendingId.includes('SHFT')) {
      // Shafts are modeled about their midpoint, so their origin belongs on
      // the hole centerline rather than on either face of the material.
      return displacement(
        args.holeFace.hole.worldPosition,
        lookRotation(args.holeFace.direction, _up, new Quaternion()),
      )
    }
    if (pendingId.includes('Hole')) {
      return displacement(args.holeFace.position, args.holeFace.lookRotation)
    }
    if (STANDOFF_IDS.has(definition?.id ?? '')) {
      const offset = args.holeFace.direction.clone().multiplyScalar(primaryHoleDepthFor(pendingAsPart) / 2)
      return displacement(args.holeFace.position.clone().add(offset), args.holeFace.lookRotation)
    }
    if (definition?.id === 'PLSI' || definition?.id === 'MESI') {
      if (isHighStrengthHole(args.holeFace.hole)) {
        const pos = args.holeFace.position.clone().addScaledVector(args.holeFace.direction, -INSERT_OFFSET)
        return displacement(pos, lookRotation(args.holeFace.direction.clone().negate(), _up, new Quaternion()))
      }
    }
    if (definition?.id === 'NUT') {
      return displacement(args.holeFace.position, args.holeFace.lookRotation)
    }
  }

  return ground
}
