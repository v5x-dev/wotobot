import { describe, expect, it } from 'vitest'
import { loadingBoxForPart } from './loadingBounds'
import { partKey, type PlacedPart } from './parts'
import { PARTS } from './partsCatalog'

function part(id: string, param1: string, param2: string): PlacedPart {
  const definition = findPartById(id)
  return {
    instanceId: 1,
    key: partKey(definition),
    param1,
    param2,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    color: null,
  }
}

function findPartById(id: string) {
  const result = PARTS.find((definition) => definition.id === id)
  if (!result) throw new Error(`Missing test part ${id}`)
  return result
}

describe('loadingBoxForPart', () => {
  it('matches generated C-Channel catalog dimensions', () => {
    expect(loadingBoxForPart(part('CCHL', '1x2', '5'))).toEqual({
      position: [0, 0, -0.225],
      size: [2.5, 1, 0.55],
    })
    expect(loadingBoxForPart(part('CCHL', '1x5', '20')).size).toEqual([10, 2.5, 0.55])
  })

  it('scales other generated parts from their parameters', () => {
    expect(loadingBoxForPart(part('ANGL', '3x3', '10')).size).toEqual([5, 1.5, 1.5])
    expect(loadingBoxForPart(part('PLTE', '8', '3')).size).toEqual([4, 1.5, 0.046])
    expect(loadingBoxForPart(part('SHFT', 'Normal', '6')).size).toEqual([0.125, 0.125, 6])
    expect(loadingBoxForPart(part('UCHL', '2x2', '12')).size).toEqual([6, 1.142, 1.017])
  })
})
