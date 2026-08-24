import { describe, expect, it } from 'vitest'
import { makePart } from '@/test/fixtures'
import { connectedIds, effectiveGraph, isTargetHoleType, unionConnected } from './connections'

describe('connections', () => {
  it('finds transitive connections and unions multiple selections', () => {
    const graph = new Map([[1, new Set([2])], [2, new Set([1, 3])], [3, new Set([2])], [4, new Set<number>()]])
    expect([...connectedIds(1, graph)]).toEqual([1, 2, 3])
    expect([...unionConnected([1, 4], graph)]).toEqual([1, 2, 3, 4])
  })

  it('treats explicit groups as effective connections', () => {
    const graph = effectiveGraph([
      makePart('CCHL', { instanceId: 1, groupId: 8 }),
      makePart('SPKT', { instanceId: 2, groupId: 8 }),
      makePart('CCHL', { instanceId: 3 }),
    ])
    expect([...connectedIds(1, graph)]).toEqual([1, 2])
    expect([...connectedIds(3, graph)]).toEqual([3])
  })

  it('matches fasteners to the hole types they can connect', () => {
    expect(isTargetHoleType('threaded', 'SCRW')).toBe(true)
    expect(isTargetHoleType('clamp', 'SHFT')).toBe(true)
    expect(isTargetHoleType('normal', 'SCRW')).toBe(false)
  })
})
