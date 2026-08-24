import { describe, expect, it } from 'vitest'
import { makePart } from '@/test/fixtures'
import { gramsToPounds, partWeightGrams, partsListText, totalWeightPounds } from './weight'

describe('weight calculations', () => {
  it('calculates generated aluminum, shaft, plate, and polygon weights', () => {
    expect(partWeightGrams(makePart('CCHL', { param1: '1x2', param2: '10' }))).toBeCloseTo(20.8)
    expect(partWeightGrams(makePart('SHFT', { param1: 'High Strength', param2: '4' }))).toBeCloseTo(26)
    expect(partWeightGrams(makePart('POLY', { shape: { kind: 'polygon', thickness: 0.0625, points: [[0, 0], [2, 0], [0, 2]], holes: [] } }))).toBeCloseTo(2 * 0.0625 * 16.387064 * 1.2)
  })

  it('sums pounds and consolidates identical lines in the parts list', () => {
    const parts = [
      makePart('CCHL', { instanceId: 1, param1: '1x2', param2: '5' }),
      makePart('CCHL', { instanceId: 2, param1: '1x2', param2: '5' }),
    ]
    expect(totalWeightPounds(parts)).toBeCloseTo(gramsToPounds(20.8))
    expect(partsListText(parts)).toContain('1x2 C-Channel (5) x2')
  })
})
