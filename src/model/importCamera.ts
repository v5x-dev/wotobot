import type { CameraState, PlacedPart } from '@/persistence/document'

const MIN_IMPORT_SPAN = 10
const IMPORT_DISTANCE_MULTIPLIER = 2.5

export function cameraForImportedParts(
  parts: PlacedPart[],
  current: CameraState,
): CameraState {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const part of parts) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], part.position[axis])
      max[axis] = Math.max(max[axis], part.position[axis])
    }
  }

  const target = parts.length === 0
    ? [0, 0, 0] as [number, number, number]
    : min.map((value, axis) => (value + max[axis]) / 2) as [number, number, number]
  const span = parts.length === 0
    ? MIN_IMPORT_SPAN
    : Math.max(...max.map((value, axis) => value - min[axis]), MIN_IMPORT_SPAN)

  let direction = current.position.map((value, axis) => value - current.target[axis])
  let directionLength = Math.hypot(...direction)
  if (directionLength < Number.EPSILON) {
    direction = [0, 0, 1]
    directionLength = 1
  }
  const distance = span * IMPORT_DISTANCE_MULTIPLIER
  const position = direction.map(
    (value, axis) => target[axis] + value / directionLength * distance,
  ) as [number, number, number]

  return { ortho: true, target, position }
}
