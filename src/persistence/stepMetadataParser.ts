export type StepPartMetadata = {
  instanceId: string
  productId: string
  name: string
  description?: string
  kind: 'part' | 'assembly'
  path: string[]
  position: [number, number, number]
  rotation: [number, number, number]
  basis?: [number, number, number, number, number, number, number, number, number]
}

export type StepMetadata = {
  schema: string | null
  units: string
  parts: StepPartMetadata[]
}

type Matrix = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]
type Product = { productId: string; name: string; description?: string }
type Usage = { id: string; instanceId: string; name: string; description?: string; parent: string; child: string }
type Placement = { point: string | null; axis: string | null; refDirection: string | null }

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
const KEPT_ENTITY = /\b(?:PRODUCT|PRODUCT_DEFINITION_FORMATION(?:_WITH_SPECIFIED_SOURCE)?|PRODUCT_DEFINITION|NEXT_ASSEMBLY_USAGE_OCCURRENCE|PRODUCT_DEFINITION_SHAPE|CONTEXT_DEPENDENT_SHAPE_REPRESENTATION|REPRESENTATION_RELATIONSHIP|REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION|ITEM_DEFINED_TRANSFORMATION|AXIS2_PLACEMENT_3D|CARTESIAN_POINT|DIRECTION|SI_UNIT|CONVERSION_BASED_UNIT)\s*\(/i

function round(value: number) {
  return Math.abs(value) < 1e-12 ? 0 : Math.round(value * 1e12) / 1e12
}

function splitArguments(source: string) {
  const result: string[] = []
  let start = 0
  let depth = 0
  let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char === "'") {
      if (quoted && source[index + 1] === "'") index += 1
      else quoted = !quoted
    } else if (!quoted) {
      if (char === '(') depth += 1
      else if (char === ')') depth -= 1
      else if (char === ',' && depth === 0) {
        result.push(source.slice(start, index).trim())
        start = index + 1
      }
    }
  }
  result.push(source.slice(start).trim())
  return result
}

function entityArguments(source: string, typePattern: string) {
  const match = new RegExp(`\\b${typePattern}\\s*\\(`, 'i').exec(source)
  if (!match) return null
  const start = match.index + match[0].length
  let depth = 1
  let quoted = false
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (char === "'") {
      if (quoted && source[index + 1] === "'") index += 1
      else quoted = !quoted
    } else if (!quoted) {
      if (char === '(') depth += 1
      else if (char === ')') {
        depth -= 1
        if (depth === 0) return splitArguments(source.slice(start, index))
      }
    }
  }
  return null
}

function ref(value: string | undefined) {
  return value?.match(/#(\d+)/)?.[1] ?? null
}

function stepText(value: string | undefined) {
  if (!value || !value.startsWith("'")) return ''
  return value.slice(1, -1).replace(/''/g, "'").replace(/\\X2\\([0-9A-F]+)\\X0\\/gi, (_whole, hex: string) => {
    let decoded = ''
    for (let index = 0; index < hex.length; index += 4) decoded += String.fromCharCode(Number.parseInt(hex.slice(index, index + 4), 16))
    return decoded
  })
}

function numbers(value: string | undefined): [number, number, number] | null {
  const parsed = value?.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:E[+-]?\d+)?/gi)?.map(Number)
  return parsed && parsed.length >= 2 ? [parsed[0], parsed[1], parsed[2] ?? 0] : null
}

function normalize(vector: [number, number, number], fallback: [number, number, number]) {
  const length = Math.hypot(...vector)
  return length > 1e-12 ? vector.map((value) => value / length) as [number, number, number] : fallback
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function placementMatrix(placement: Placement | undefined, points: Map<string, [number, number, number]>, directions: Map<string, [number, number, number]>): Matrix {
  if (!placement) return [...IDENTITY]
  const origin = placement.point ? points.get(placement.point) : null
  const z = normalize(placement.axis ? directions.get(placement.axis) ?? [0, 0, 1] : [0, 0, 1], [0, 0, 1])
  const rawX = normalize(placement.refDirection ? directions.get(placement.refDirection) ?? [1, 0, 0] : [1, 0, 0], [1, 0, 0])
  const y = normalize(cross(z, rawX), [0, 1, 0])
  const x = normalize(cross(y, z), [1, 0, 0])
  return [x[0], y[0], z[0], origin?.[0] ?? 0, x[1], y[1], z[1], origin?.[1] ?? 0, x[2], y[2], z[2], origin?.[2] ?? 0, 0, 0, 0, 1]
}

function multiply(a: Matrix, b: Matrix): Matrix {
  const result = Array<number>(16).fill(0)
  for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) for (let index = 0; index < 4; index += 1) result[row * 4 + column] += a[row * 4 + index] * b[index * 4 + column]
  return result as Matrix
}

function invertRigid(matrix: Matrix): Matrix {
  const x = [matrix[0], matrix[4], matrix[8]], y = [matrix[1], matrix[5], matrix[9]], z = [matrix[2], matrix[6], matrix[10]], p = [matrix[3], matrix[7], matrix[11]]
  return [x[0], x[1], x[2], -(x[0] * p[0] + x[1] * p[1] + x[2] * p[2]), y[0], y[1], y[2], -(y[0] * p[0] + y[1] * p[1] + y[2] * p[2]), z[0], z[1], z[2], -(z[0] * p[0] + z[1] * p[1] + z[2] * p[2]), 0, 0, 0, 1]
}

function eulerDegrees(matrix: Matrix): [number, number, number] {
  const y = Math.asin(Math.max(-1, Math.min(1, matrix[2])))
  const regular = Math.abs(matrix[2]) < 0.9999999
  const x = regular ? Math.atan2(-matrix[6], matrix[10]) : Math.atan2(matrix[9], matrix[5])
  const z = regular ? Math.atan2(-matrix[1], matrix[0]) : 0
  return [round(x * 180 / Math.PI), round(y * 180 / Math.PI), round(z * 180 / Math.PI)]
}

function rotationBasis(matrix: Matrix): StepPartMetadata['basis'] {
  return [
    matrix[0], matrix[1], matrix[2],
    matrix[4], matrix[5], matrix[6],
    matrix[8], matrix[9], matrix[10],
  ].map(round) as StepPartMetadata['basis']
}

function scanEntities(source: string, onProgress?: (percent: number) => void) {
  const entities = new Map<string, string>()
  const dataStart = source.search(/\bDATA\s*;/i)
  let index = dataStart < 0 ? 0 : dataStart + 5
  let lastPercent = -1
  while (index < source.length) {
    const hash = source.indexOf('#', index)
    if (hash < 0) break
    let cursor = hash + 1
    while (/\d/.test(source[cursor] ?? '')) cursor += 1
    if (cursor === hash + 1) { index = cursor; continue }
    const equals = source.indexOf('=', cursor)
    if (equals < 0 || equals - cursor > 20) { index = cursor; continue }
    let quoted = false
    let end = equals + 1
    for (; end < source.length; end += 1) {
      if (source[end] === "'") {
        if (quoted && source[end + 1] === "'") end += 1
        else quoted = !quoted
      } else if (!quoted && source[end] === ';') break
    }
    const entity = source.slice(equals + 1, end).trim()
    if (KEPT_ENTITY.test(entity)) entities.set(source.slice(hash + 1, cursor), entity)
    index = end + 1
    const percent = Math.floor(index / source.length * 100)
    if (percent >= lastPercent + 5) { lastPercent = percent; onProgress?.(Math.min(percent, 100)) }
  }
  onProgress?.(100)
  return entities
}

function detectUnits(source: string) {
  if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/i.test(source)) return 'millimeter'
  if (/CONVERSION_BASED_UNIT\s*\(\s*'INCH'/i.test(source)) return 'inch'
  if (/CONVERSION_BASED_UNIT\s*\(\s*'(?:FOOT|FEET)'/i.test(source)) return 'foot'
  if (/SI_UNIT\s*\(\s*\$\s*,\s*\.METRE\.\s*\)/i.test(source)) return 'meter'
  return 'unknown'
}

export function parseStepMetadata(source: string, onProgress?: (percent: number) => void): StepMetadata {
  const entities = scanEntities(source, onProgress)
  const products = new Map<string, Product>(), formationProduct = new Map<string, string>(), definitionFormation = new Map<string, string>()
  const usages: Usage[] = [], pdsDefinition = new Map<string, string>(), contextRelation = new Map<string, string>()
  const relationships = new Map<string, string | null>(), transforms = new Map<string, { item1: string | null; item2: string | null }>()
  const placements = new Map<string, Placement>(), points = new Map<string, [number, number, number]>(), directions = new Map<string, [number, number, number]>()

  for (const [id, entity] of entities) {
    let args = entityArguments(entity, 'PRODUCT')
    if (args) { products.set(id, { productId: stepText(args[0]) || id, name: stepText(args[1]) || stepText(args[0]) || `Product ${id}`, ...(stepText(args[2]) ? { description: stepText(args[2]) } : {}) }); continue }
    args = entityArguments(entity, 'PRODUCT_DEFINITION_FORMATION(?:_WITH_SPECIFIED_SOURCE)?')
    if (args) { const product = ref(args[2]); if (product) formationProduct.set(id, product); continue }
    args = entityArguments(entity, 'PRODUCT_DEFINITION')
    if (args) { const formation = ref(args[2]); if (formation) definitionFormation.set(id, formation); continue }
    args = entityArguments(entity, 'NEXT_ASSEMBLY_USAGE_OCCURRENCE')
    if (args) { const parent = ref(args[3]), child = ref(args[4]); if (parent && child) usages.push({ id, instanceId: stepText(args[0]) || id, name: stepText(args[1]), ...(stepText(args[2]) ? { description: stepText(args[2]) } : {}), parent, child }); continue }
    args = entityArguments(entity, 'PRODUCT_DEFINITION_SHAPE')
    if (args) { const definition = ref(args[2]); if (definition) pdsDefinition.set(id, definition); continue }
    args = entityArguments(entity, 'CONTEXT_DEPENDENT_SHAPE_REPRESENTATION')
    if (args) { const relation = ref(args[0]), pds = ref(args[1]); if (relation && pds) contextRelation.set(pds, relation); continue }
    const relationArgs = entityArguments(entity, 'REPRESENTATION_RELATIONSHIP')
    const relationTransformArgs = entityArguments(entity, 'REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION')
    if (relationArgs || relationTransformArgs) { relationships.set(id, relationTransformArgs ? ref(relationTransformArgs.length === 1 ? relationTransformArgs[0] : relationTransformArgs[4]) : null); continue }
    args = entityArguments(entity, 'ITEM_DEFINED_TRANSFORMATION')
    if (args) { transforms.set(id, { item1: ref(args.at(-2)), item2: ref(args.at(-1)) }); continue }
    args = entityArguments(entity, 'AXIS2_PLACEMENT_3D')
    if (args) { placements.set(id, { point: ref(args[1]), axis: ref(args[2]), refDirection: ref(args[3]) }); continue }
    args = entityArguments(entity, 'CARTESIAN_POINT')
    if (args) { const value = numbers(args[1]); if (value) points.set(id, value); continue }
    args = entityArguments(entity, 'DIRECTION')
    if (args) { const value = numbers(args[1]); if (value) directions.set(id, value) }
  }

  if (products.size === 0) throw new Error('No product metadata was found in this STEP file.')

  const definitionProduct = new Map<string, string>()
  for (const [definition, formation] of definitionFormation) {
    const product = formationProduct.get(formation)
    if (product) definitionProduct.set(definition, product)
  }

  const usageById = new Map(usages.map((usage) => [usage.id, usage]))
  const usageTransforms = new Map<string, Matrix>()
  for (const [pds, definition] of pdsDefinition) {
    const usage = usageById.get(definition)
    const transform = transforms.get(relationships.get(contextRelation.get(pds) ?? '') ?? '')
    if (!usage || !transform) continue
    const item1 = placementMatrix(placements.get(transform.item1 ?? ''), points, directions)
    const item2 = placementMatrix(placements.get(transform.item2 ?? ''), points, directions)
    usageTransforms.set(usage.id, multiply(item2, invertRigid(item1)))
  }

  const childrenByParent = new Map<string, Usage[]>(), childDefinitions = new Set<string>()
  for (const usage of usages) { const children = childrenByParent.get(usage.parent) ?? []; children.push(usage); childrenByParent.set(usage.parent, children); childDefinitions.add(usage.child) }
  const roots = [...definitionProduct.keys()].filter((definition) => !childDefinitions.has(definition))
  const parts: StepPartMetadata[] = [], active = new Set<string>()
  function visit(definition: string, parentMatrix: Matrix, path: string[]) {
    if (active.has(definition)) return
    active.add(definition)
    for (const usage of childrenByParent.get(definition) ?? []) {
      const product = products.get(definitionProduct.get(usage.child) ?? '')
      if (!product) continue
      const name = usage.name || product.name, nextPath = [...path, name], world = multiply(parentMatrix, usageTransforms.get(usage.id) ?? IDENTITY)
      parts.push({ instanceId: usage.instanceId, productId: product.productId, name, ...(usage.description || product.description ? { description: usage.description || product.description } : {}), kind: childrenByParent.has(usage.child) ? 'assembly' : 'part', path: nextPath, position: [round(world[3]), round(world[7]), round(world[11])], rotation: eulerDegrees(world), basis: rotationBasis(world) })
      visit(usage.child, world, nextPath)
    }
    active.delete(definition)
  }
  for (const root of roots) { const product = products.get(definitionProduct.get(root) ?? ''); visit(root, IDENTITY, product ? [product.name] : []) }
  if (usages.length === 0) for (const definition of roots) { const product = products.get(definitionProduct.get(definition) ?? ''); if (product) parts.push({ instanceId: definition, productId: product.productId, name: product.name, ...(product.description ? { description: product.description } : {}), kind: 'part', path: [product.name], position: [0, 0, 0], rotation: [0, 0, 0], basis: rotationBasis(IDENTITY) }) }

  return { schema: source.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i)?.[1] ?? null, units: detectUnits(source), parts }
}
