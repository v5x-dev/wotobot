import { describe, expect, it } from 'vitest'
import { makePart } from '@/test/fixtures'
import {
  HIGH_STRENGTH_CHAIN_PITCH,
  STANDARD_CHAIN_PITCH,
  chainFitError,
  chainGeometry,
  chainLinkCount,
  chainSelection,
  sprocketPitchRadius,
} from './chains'

describe('sprocket chains', () => {
  const sprocket = (instanceId: number, x: number, param1 = 'Normal', param2 = '10T') =>
    makePart('SPKT', { instanceId, position: [x, 0, 0], param1, param2 })

  it('accepts coplanar parallel sprockets and rejects incompatible fits', () => {
    const a = sprocket(1, 0)
    expect(chainFitError(a, sprocket(2, 2))).toBeNull()
    expect(chainFitError(a, sprocket(2, 2, 'High Strength'))).toMatch(/same chain type/)
    expect(chainFitError(a, makePart('SPKT', { instanceId: 2, position: [2, 0, 0], rotation: [0, Math.PI / 4, 0] }))).toMatch(/parallel/)
    expect(chainFitError(a, makePart('SPKT', { instanceId: 2, position: [2, 0, 0.1] }))).toMatch(/same plane/)
    expect(chainFitError(a, sprocket(2, 0.01))).toMatch(/farther apart/)
  })

  it.each([
    ['Normal', '10T', '24T', STANDARD_CHAIN_PITCH, 'standard'],
    ['High Strength', '18T', '30T', HIGH_STRENGTH_CHAIN_PITCH, 'high-strength'],
  ] as const)('builds closed tangent geometry for %s sprocket combinations', (type, teethA, teethB, pitch, kind) => {
    const a = sprocket(1, 0, type, teethA)
    const b = sprocket(2, 4, type, teethB)
    const geometry = chainGeometry(a, b)
    expect(geometry).not.toBeNull()
    expect(geometry?.kind).toBe(kind)
    expect(geometry?.pitch).toBe(pitch)
    expect(geometry?.axis).toEqual([0, 0, 1])
    expect(geometry!.points.length).toBeGreaterThan(12)
    expect(chainLinkCount(a, b)).toBeGreaterThan(0)
    expect(chainLinkCount(a, b) % 1).toBe(0)
    expect(sprocketPitchRadius(b)).toBeGreaterThan(sprocketPitchRadius(a))
  })

  it('reports add and remove actions for a valid selected pair', () => {
    const parts = [sprocket(1, 0), sprocket(2, 2)]
    expect(chainSelection(parts, [1, 2], []).mode).toBe('add')
    expect(chainSelection(parts, [1, 2], [{ id: 1, sprocketAId: 2, sprocketBId: 1 }]).mode).toBe('remove')
  })
})
