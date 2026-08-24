import { describe, expect, it } from 'vitest'
import { makePart } from '@/test/fixtures'
import { evaluatePolycarbonate, polycarbonateLimitReasons, polycarbonatePieceStatus } from './polycarbonateLimits'

describe('polycarbonate limits', () => {
  it('accepts a rotated 4 by 8 footprint and computes polygon area', () => {
    const part = makePart('POLY', { shape: { kind: 'polygon', thickness: 0.0625, points: [[-4, -2], [4, -2], [4, 2], [-4, 2]], holes: [] } })
    expect(polycarbonatePieceStatus(part)).toMatchObject({ width: 8, height: 4, area: 32, over: false })
  })

  it('flags footprint, thickness, total area, and piece-count violations', () => {
    const oversized = makePart('POLY', { instanceId: 1, shape: { kind: 'polygon', thickness: 0.08, points: [[0, 0], [9, 0], [9, 5], [0, 5]], holes: [] } })
    const parts = Array.from({ length: 13 }, (_, index) => ({ ...oversized, instanceId: index + 1 }))
    const status = evaluatePolycarbonate(parts)
    expect(status).toMatchObject({ count: 13, overCount: true, overArea: true, over: true })
    expect(polycarbonateLimitReasons(status).join(' ')).toMatch(/13 pieces.*in² used.*piece 1.*thick/)
  })

  it('ignores non-polycarbonate parts', () => {
    expect(evaluatePolycarbonate([makePart('CCHL')])).toMatchObject({ count: 0, totalArea: 0, over: false })
  })
})
