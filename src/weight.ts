import { WEIGHTS_CATALOG } from './weightsCatalog'
import { findPart, type PlacedPart } from './parts'

const GRAMS_PER_POUND = 453.592

const ALUMINUM_GRAMS: Record<string, Record<string, number>> = {
  CCHL: { '1x2': 2.08, '1x3': 3.05, '1x5': 3.84 },
  ANGL: { '1x1': 1.3, '2x2': 2.0, '3x3': 6.69 },
  UCHL: { default: 3.4 },
  RAIL: { default: 0.942 },
}

type WeightEntry = {
  grams: number
  name: string
  param1: string | null
  param2: string | null
}

const WEIGHTS = WEIGHTS_CATALOG as unknown as Record<string, WeightEntry[]>

function catalogWeights(part: PlacedPart) {
  const definition = findPart(part.key)
  if (!definition) return undefined
  return WEIGHTS[`${definition.group}:${definition.id}`] ?? WEIGHTS[definition.id]
}

export function partWeightGrams(part: PlacedPart) {
  const definition = findPart(part.key)
  if (!definition) return 0

  if (definition.generator === 'aluminum') {
    const table = ALUMINUM_GRAMS[definition.id]
    const perHole = table?.[part.param1] ?? table?.default ?? 0
    return perHole * (Number(part.param2) || 0)
  }

  if (definition.generator === 'plate') {
    return (Number(part.param1) || 0) * (Number(part.param2) || 0) * 0.53
  }

  if (definition.generator === 'shaft') {
    const inches = Number(part.param2) || 0
    return inches * (part.param1.includes('High') ? 6.5 : 1.9)
  }

  const weights = catalogWeights(part)
  if (!weights?.length) return 0
  const match =
    weights.find((entry) => entry.param1 === part.param1 && (entry.param2 ?? '') === (part.param2 ?? '')) ??
    weights.find((entry) => entry.param1 === part.param1) ??
    weights[0]
  return match?.grams ?? 0
}

export function gramsToPounds(grams: number) {
  return grams / GRAMS_PER_POUND
}

export function totalWeightPounds(parts: PlacedPart[]) {
  return gramsToPounds(parts.reduce((sum, part) => sum + partWeightGrams(part), 0))
}

export function partListLabel(part: PlacedPart) {
  const definition = findPart(part.key)
  const name = definition?.name ?? part.key
  if (definition?.generator === 'aluminum') {
    return `${part.param1} ${name} (${part.param2})`
  }
  if (definition?.generator === 'plate') {
    return `Plate (${part.param1}x${part.param2})`
  }
  if (definition?.generator === 'shaft') {
    return `${part.param1} Shaft (${part.param2})`
  }
  return [name, part.param1, part.param2].filter(Boolean).join(' ')
}

export function partsListText(parts: PlacedPart[]) {
  if (parts.length === 0) return 'No parts.\n'

  const counts = new Map<string, { count: number; grams: number }>()
  for (const part of parts) {
    const label = partListLabel(part)
    const current = counts.get(label) ?? { count: 0, grams: 0 }
    current.count += 1
    current.grams += partWeightGrams(part)
    counts.set(label, current)
  }

  const total = gramsToPounds(parts.reduce((sum, part) => sum + partWeightGrams(part), 0))
  const lines = [
    '======DISCLAIMER======',
    'HS is an abbreviation of High Strength',
    'Numbers inside of () are used to represent the hole count, for example C-Channel 1x2x1 (25) means the C-Channel is 25 holes long',
    '======================',
    '',
    `Total Estimated Weight: ${total} lbs`,
    '',
    '======PARTS LIST======',
  ]

  for (const [label, { count, grams }] of [...counts.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const pounds = gramsToPounds(grams)
    lines.push(pounds === 0 ? `${label} x${count} (Weight not found)` : `${label} x${count} (${pounds.toFixed(6)} lbs)`)
  }

  return `${lines.join('\n')}\n`
}
