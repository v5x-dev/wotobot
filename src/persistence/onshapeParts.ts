import { PARTS } from '@/model/partsCatalog'
import { defaultParamValue, partKey, type PartDefinition, type PlacedPart } from '@/model/parts'
import { alignCatalogPart, sourceQuaternion } from './onshapeAlignment'
import type { StepMetadata, StepPartMetadata } from './stepMetadataParser'

const METERS_TO_INCHES = 39.37007874015748
const MILLIMETERS_TO_INCHES = 1 / 25.4

export type StepPartImport = {
  parts: PlacedPart[]
  skipped: StepPartMetadata[]
}

export type OnshapePartMappings = Record<string, string>

type Match = {
  definition: PartDefinition
  param1?: string
  param2?: string
}

function catalogPart(id: string) {
  const part = PARTS.find((candidate) => candidate.id === id)
  if (!part) throw new Error(`The ${id} catalog part is missing.`)
  return part
}

function sizeInches(name: string) {
  const match = name.match(/\b(\d+(?:\.\d+)?)\s*["”]|\b(\d+(?:\.\d+)?)\s*(?:in|inch)\b/i)
  if (!match) return undefined
  const value = match[1] ?? match[2]
  return `${Number.isInteger(Number(value)) ? Number(value).toFixed(2) : value}in`
}

function matchPart(source: StepPartMetadata): Match | null {
  const name = `${source.name} ${source.productId} ${source.description ?? ''}`

  const channel = name.match(/\b1\s*x\s*(2|3|5)\s*x\s*1\s*x\s*(\d+)\b.*\bC-?Channel\b/i)
  if (channel) return { definition: catalogPart('CCHL'), param1: `1x${channel[1]}`, param2: channel[2] }

  const uChannel = name.match(/\b2\s*x\s*2\s*x\s*2\s*x\s*(\d+)\b.*\bU-?Channel\b/i)
  if (uChannel) return { definition: catalogPart('UCHL'), param1: '2x2', param2: uChannel[1] }

  const angle = name.match(/\b(1|2|3)\s*x\s*(1|2|3)\s*x\s*(\d+)\b.*\bAluminum Angle\b/i)
  if (angle) return { definition: catalogPart('ANGL'), param1: `${angle[1]}x${angle[2]}`, param2: angle[3] }

  if (/\b(?:V5\s+)?Smart Motor\b/i.test(name)) {
    return { definition: catalogPart('MOTR'), param1: /5\.5W/i.test(name) ? '5.5W' : '11W' }
  }

  const gear = name.match(/\b(12|24|36|48|60|72|84)T\b.*\bGear\b/i)
  if (gear) {
    const type = /High Strength.*(?:V2|v2)/i.test(name)
      ? 'High Strength v2'
      : /High Strength/i.test(name) ? 'High Strength' : 'Normal'
    return { definition: catalogPart('GEAR'), param1: type, param2: `${gear[1]}T` }
  }

  if (/\bAnti-Static Wheel\b/i.test(name)) {
    return { definition: catalogPart('TWHL'), param1: 'V2', param2: sizeInches(name) ?? '2.75in' }
  }

  if (/\bAnti-Static Omni-Directional Wheel\b/i.test(name)) {
    return { definition: catalogPart('OMNI'), param1: 'V2', param2: sizeInches(name) ?? '2.75in' }
  }

  if (/\bFlex Wheel\b/i.test(name)) {
    return { definition: catalogPart('FWHL'), param1: 'No Adapters', param2: sizeInches(name) ?? '2.00in' }
  }

  if (/\bNylock Nut\b/i.test(name)) return { definition: catalogPart('NUT'), param1: 'Lock' }

  if (/\b2-1\/2"\s+Star Drive Screw\b/i.test(name)) {
    return { definition: catalogPart('SCRW'), param1: '2.50in' }
  }

  const standoff = name.match(/\b(\d+(?:\.\d+)?|\d+\/\d+|\d+-\d+\/\d+)"\s+Long.*\bStandoff\b/i)
  if (standoff) {
    return { definition: catalogPart('SNDF'), param1: `${standoff[1]}in` }
  }

  const shaft = name.match(/(?:^|\s)(\d+(?:\.\d+)?)"\s+(High Strength|Standard) Shaft\b/i)
  if (shaft) {
    return {
      definition: catalogPart('SHFT'),
      param1: /^High Strength$/i.test(shaft[2]) ? 'High Strength' : 'Normal',
      param2: shaft[1],
    }
  }

  const spacer = name.match(/\b(1\/16|1\/8|1\/4|3\/8|1\/2)"?\s+High Strength Shaft Spacer\b/i)
  if (spacer) return { definition: catalogPart('SPCR'), param1: 'High Strength', param2: `${spacer[1]}in` }

  if (/\bShaft Collar\b/i.test(name)) {
    return { definition: catalogPart('CLMP'), param1: 'Normal', param2: 'Normal' }
  }

  if (/\bLow Profile Bearing Flat\b/i.test(name)) {
    return { definition: catalogPart('BRNG'), param1: 'Low Profile' }
  }

  if (/\bVEX-HINGE-1\s+RevA\b/i.test(name)) return { definition: catalogPart('HING') }

  const sprocket = name.match(/\b(\d+)T\s+(High Strength )?Sprocket\b/i)
  if (sprocket) return { definition: catalogPart('SPKT'), param1: sprocket[2] ? 'High Strength' : 'Normal', param2: `${sprocket[1]}T` }

  if (/\bRotation Sensor\b/i.test(name)) {
    return { definition: catalogPart('SNSR'), param1: 'Rotation', param2: 'V5' }
  }

  if (/\bHigh Strength Pillow Block Bearing\b/i.test(name)) {
    return { definition: catalogPart('BLCK'), param1: 'High Strength' }
  }

  if (/\bPneumatic Cylinder Body\b/i.test(name)) {
    const stroke = name.match(/\b(25|50|75)mm\b/)?.[1] ?? '25'
    return { definition: catalogPart('PNMT'), param1: `${stroke}mm`, param2: 'Normal' }
  }

  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  const definition = PARTS.find((candidate) => {
    const catalogName = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    return catalogName.length >= 5 && normalized.includes(catalogName)
  })
  return definition ? { definition } : null
}

function isKnownSubcomponent(source: StepPartMetadata) {
  const name = `${source.name} ${source.productId} ${source.description ?? ''}`
  return /\b(?:Pneumatic Cylinder Rod|Shaft Adapter|Gear Insert|VEX-HINGE-2(?:\s+RevA)?|VEX-HINGE-PIN)\b/i.test(name)
}

function unitScale(units: string) {
  if (units === 'meter') return METERS_TO_INCHES
  if (units === 'millimeter') return MILLIMETERS_TO_INCHES
  if (units === 'foot') return 12
  return 1
}

function editorPosition(position: [number, number, number], scale: number): [number, number, number] {
  const converted = position.map((value) => value * scale)
  return converted.map((value) => Math.round(value * 1e9) / 1e9) as [number, number, number]
}

function centerOnGrid(parts: PlacedPart[]) {
  if (parts.length === 0) return
  const xs = parts.map((part) => part.position[0])
  const ys = parts.map((part) => part.position[1])
  const zs = parts.map((part) => part.position[2])
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  const minY = Math.min(...ys)
  const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2

  for (const part of parts) {
    part.position = [part.position[0] - centerX, part.position[1] - minY, part.position[2] - centerZ]
  }
}

type MetadataInput = StepMetadata | {
  source: { units: string }
  parts: StepPartMetadata[]
}

export function stepMetadataToParts(
  metadata: MetadataInput,
  mappings: OnshapePartMappings = {},
): StepPartImport {
  const parts: PlacedPart[] = []
  const skipped: StepPartMetadata[] = []
  const scale = unitScale('units' in metadata ? metadata.units : metadata.source.units)

  for (const source of metadata.parts) {
    if (source.kind === 'assembly') continue
    if (isKnownSubcomponent(source)) continue
    const mappedKey = mappings[source.instanceId]
    const mappedDefinition = mappedKey
      ? PARTS.find((candidate) => partKey(candidate) === mappedKey)
      : undefined
    const match = mappedDefinition ? { definition: mappedDefinition } : matchPart(source)
    if (!match) {
      skipped.push(source)
      continue
    }
    const { definition } = match
    const param1 = match.param1 ?? defaultParamValue(definition.param1)
    const param2 = match.param2 ?? defaultParamValue(definition.param2)
    const variantExists = definition.id === 'SNDF' || definition.variants.length === 0 || definition.variants.some(
      (variant) => variant.param1 === param1 && (!variant.param2 || variant.param2 === param2),
    )
    if (!variantExists) {
      skipped.push(source)
      continue
    }
    const transform = alignCatalogPart(
      editorPosition(source.position, scale),
      sourceQuaternion(source.basis, source.rotation),
      definition,
      param1,
      param2,
    )
    parts.push({
      instanceId: parts.length + 1,
      key: partKey(definition),
      onshapeName: source.name,
      param1,
      param2,
      position: transform.position,
      rotation: transform.rotation,
      color: null,
    })
  }

  centerOnGrid(parts)
  return { parts, skipped }
}
