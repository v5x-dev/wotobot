import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { makePart } from '@/test/fixtures'
import type { WorldHole } from './connections'
import { holeFaceFromHit, snapPlacement } from './placementSnap'

const hole: WorldHole = {
  partId: 10,
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  size: [0.18, 0.18],
  depth: 0.25,
  type: 'normal',
  twoSided: true,
  shape: 'circle',
  worldPosition: new Vector3(1, 2, 3),
  worldForward: new Vector3(0, 0, 1),
}

describe('placement snapping', () => {
  it('chooses and flips the visible face of a hole', () => {
    expect(holeFaceFromHit(hole, new Vector3(0, 0, -1), false).position.z).toBe(2.875)
    expect(holeFaceFromHit(hole, new Vector3(0, 0, -1), true).position.z).toBe(3.125)
  })

  it('snaps screws to a hole face', () => {
    const face = holeFaceFromHit(hole, new Vector3(0, 0, 1), false)
    const result = snapPlacement({
      pending: makePart('SCRW'), holeFace: face, hoverPart: null, hoverPoint: null,
      groundPoint: [9, 9, 9], currentRotation: [1, 2, 3], flip: false,
    })
    expect(result.position).toEqual([1, 2, 3.125])
    expect(result.modifyRotation).toBe(true)
  })

  it('keeps ground position and rotation when there is no snap target', () => {
    const result = snapPlacement({
      pending: makePart('CCHL'), holeFace: null, hoverPart: null, hoverPoint: null,
      groundPoint: [4, 5, 6], currentRotation: [0.1, 0.2, 0.3], flip: false,
    })
    expect(result).toEqual({ position: [4, 5, 6], rotation: [0.1, 0.2, 0.3], modifyRotation: false })
  })

  it('projects shaft-compatible hardware onto the shaft axis', () => {
    const result = snapPlacement({
      pending: makePart('SNDF'), holeFace: null,
      hoverPart: makePart('SHFT', { position: [1, 1, 1], rotation: [0, 0, 0] }),
      hoverPoint: new Vector3(1.2, 1.3, 2.5), groundPoint: [0, 0, 0],
      currentRotation: [0, 0, 0], flip: false,
    })
    expect(result.position[0]).toBeCloseTo(1)
    expect(result.position[1]).toBeCloseTo(1)
    expect(result.position[2]).toBeCloseTo(2.5)
    expect(result.modifyRotation).toBe(true)
  })
})
