import { describe, expect, it } from 'vitest'
import { plateInstancePositions } from './plateInstances'

describe('plate instances', () => {
  it('creates one centered instance per plate cell', () => {
    expect(plateInstancePositions(3, 2)).toEqual([
      [-0.5, -0.25, 0],
      [-0.5, 0.25, 0],
      [0, -0.25, 0],
      [0, 0.25, 0],
      [0.5, -0.25, 0],
      [0.5, 0.25, 0],
    ])
  })

  it('creates a single instance at the origin for a 1 by 1 plate', () => {
    expect(plateInstancePositions(1, 1)).toEqual([[0, 0, 0]])
  })
})
