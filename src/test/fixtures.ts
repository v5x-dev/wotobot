import { PARTS } from '@/model/partsCatalog'
import { partKey, type PlacedPart } from '@/model/parts'

export function makePart(
  id: string,
  overrides: Partial<PlacedPart> = {},
): PlacedPart {
  const definition = PARTS.find((part) => part.id === id)
  if (!definition) throw new Error(`Unknown test part: ${id}`)
  return {
    instanceId: 1,
    key: partKey(definition),
    param1: definition.param1?.defaultValue ?? '',
    param2: definition.param2?.defaultValue ?? '',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    color: null,
    ...overrides,
  }
}
