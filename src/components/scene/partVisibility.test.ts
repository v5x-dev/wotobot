import { describe, expect, it } from 'vitest'
import { isPartVisible, type PartVisibilitySettings } from './PartMeshes'
import { PARTS } from '@/model/partsCatalog'
import { partKey, type PartGroup, type PlacedPart } from '@/model/parts'

const visible: PartVisibilitySettings = {
  Structure: true,
  Motion: true,
  Electronics: true,
  Pneumatics: true,
  Competition: true,
}

function placedPart(group: PartGroup): PlacedPart {
  const definition = PARTS.find((part) => part.group === group)
  if (!definition) throw new Error(`Missing test fixture for ${group}`)
  return {
    instanceId: 1,
    key: partKey(definition),
    param1: '',
    param2: '',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    color: null,
  }
}

describe('isPartVisible', () => {
  it.each(Object.keys(visible) as PartGroup[])('filters the %s category', (group) => {
    expect(isPartVisible(placedPart(group), { ...visible, [group]: false })).toBe(false)
    expect(isPartVisible(placedPart(group), visible)).toBe(true)
  })

  it('keeps unknown imported parts visible', () => {
    expect(isPartVisible({ ...placedPart('Structure'), key: 'unknown' }, visible)).toBe(true)
  })
})
