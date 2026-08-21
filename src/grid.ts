export const GRID_SNAP = 0.125
export const ROTATION_SNAP = Math.PI / 36
export const PLACEMENT_ROTATION_SNAP = Math.PI / 8

export function snap(value: number, increment = GRID_SNAP) {
  return Math.round(value / increment) * increment
}

export function snapVec3(x: number, y: number, z: number): [number, number, number] {
  return [snap(x), snap(y), snap(z)]
}

export function snapAngle(radians: number, increment = ROTATION_SNAP) {
  return Math.round(radians / increment) * increment
}
