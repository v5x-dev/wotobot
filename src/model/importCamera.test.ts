import { describe, expect, it } from 'vitest'
import { cameraForImportedParts } from './importCamera'
import type { PlacedPart } from '@/persistence/document'

function part(position: [number, number, number]): PlacedPart {
  return {
    instanceId: 1,
    key: 'test',
    param1: '',
    param2: '',
    position,
    rotation: [0, 0, 0],
    color: null,
  }
}

describe('cameraForImportedParts', () => {
  it('frames imported parts without changing the viewing direction', () => {
    const camera = cameraForImportedParts(
      [part([10, 20, 30]), part([30, 60, 50])],
      { target: [1, 2, 3], position: [5, 10, 7], ortho: false },
    )

    expect(camera.target).toEqual([20, 40, 40])
    expect(camera.ortho).toBe(true)
    const direction = camera.position.map((value, axis) => value - camera.target[axis])
    expect(direction[0] / direction[2]).toBeCloseTo(1)
    expect(direction[1] / direction[2]).toBeCloseTo(2)
  })
})
