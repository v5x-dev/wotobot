import { Vector2, type Camera, type Vector3 } from 'three'

/** Convert pointer movement along a projected world axis into world-space distance. */
export function projectedAxisDistance(
  camera: Camera,
  origin: Vector3,
  axis: Vector3,
  pointerDelta: Vector2,
  viewport: { width: number; height: number },
) {
  const projectedOrigin = origin.clone().project(camera)
  const projectedEnd = origin.clone().add(axis).project(camera)
  const screenAxis = new Vector2(
    (projectedEnd.x - projectedOrigin.x) * viewport.width / 2,
    -(projectedEnd.y - projectedOrigin.y) * viewport.height / 2,
  )
  const pixelsPerUnitSquared = screenAxis.lengthSq()
  if (pixelsPerUnitSquared < 1e-8) return 0
  return pointerDelta.dot(screenAxis) / pixelsPerUnitSquared
}
