import type { PartDefinition } from '@/model/parts'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

const MILLIMETERS_TO_INCHES = 1 / 25.4

const _sourceCenter = new Vector3()
const _catalogCenter = new Vector3()
const _position = new Vector3()
const _catalogRotation = new Quaternion()
const _euler = new Euler()

function quatFromRows(
  m00: number, m01: number, m02: number,
  m10: number, m11: number, m12: number,
  m20: number, m21: number, m22: number,
) {
  return new Quaternion().setFromRotationMatrix(new Matrix4().set(
    m00, m01, m02, 0,
    m10, m11, m12, 0,
    m20, m21, m22, 0,
    0, 0, 0, 1,
  )).normalize()
}

/**
 * Maps catalog local axes onto the Onshape VEX library part CS.
 * Columns of the matrix are catalog X/Y/Z expressed in Onshape coordinates.
 */
const CATALOG_TO_ONSHAPE = {
  // Catalog length +X, web in XY; Onshape length -Z, web in XZ, open +Y.
  extrusion: quatFromRows(
    0, 1, 0,
    0, 0, -1,
    -1, 0, 0,
  ),
  angle: quatFromRows(
    0, -1, 0,
    0, 0, -1,
    1, 0, 0,
  ),
  uChannel: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
  reservoir: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2),
  rubberBumper: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI),
  // Catalog shaft +Z; Onshape HS shaft +X.
  shaft: quatFromRows(
    0, 0, 1,
    1, 0, 0,
    0, 1, 0,
  ),
  // Catalog standoff +Z (scaled 1" mesh); Onshape hex +Y with origin 0.25" from the -Y end.
  standoff: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
}

const U_CHANNEL_ONSHAPE_CENTER = new Vector3(-3.5, -0.4455, 0)
const U_CHANNEL_CATALOG_CENTER = new Vector3(0, -0.008, -0.477)
const SHAFT_COLLAR_ONSHAPE_CENTER = new Vector3(4.2806, 5.6968, 7.9749).multiplyScalar(MILLIMETERS_TO_INCHES)

function inchesFromParam(value: string) {
  const normalized = value.trim().replace(/in$/i, '')
  const mixed = normalized.match(/^(\d+)-(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const fraction = normalized.match(/^(\d+)\/(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  const inches = Number(normalized)
  return Number.isFinite(inches) ? inches : undefined
}

function catalogOriginInOnshape(
  definition: PartDefinition,
  param1: string,
  param2: string,
  target: Vector3,
) {
  if (definition.id === 'CCHL') {
    const holes = Number(param2)
    // B-rep of 1x2/1x3 C-channels: length along -Z from the origin end, first
    // hole at z=-0.25, flange-hole center at y≈0.30. Catalog origin is length-
    // centered with the web near z=0, so y=0.052 places those flange holes.
    return Number.isFinite(holes) ? target.set(0, 0.052, -holes * 0.25) : target.set(0, 0, 0)
  }
  if (definition.id === 'ANGL') {
    const holes = Number(param2)
    if (!Number.isFinite(holes)) return target.set(0, 0, 0)
    const along = -(holes - 1) * 0.25
    if (param1 === '2x2') return target.set(0.2496, 0.046, along - 0.002568)
    if (param1 === '3x3') return target.set(-0.002, 0.044, along)
    // 1x1 B-rep: legs in +X/+Y with the corner near the origin, length -Z.
    return target.set(-0.046, 0.25, along)
  }
  if (definition.id === 'SHFT') {
    const length = Number(param2)
    const halfLengthDelta = Number.isFinite(length) ? length / 2 - 6 : 0
    return param1 === 'High Strength'
      ? target.set(halfLengthDelta, 0, 0)
      : target.set(0, 0, -halfLengthDelta)
  }
  if (definition.id === 'CLMP') return target.copy(SHAFT_COLLAR_ONSHAPE_CENTER)
  if (definition.id === 'UCHL') return target.copy(U_CHANNEL_ONSHAPE_CENTER)
  if (definition.id === 'SNDF') {
    const length = inchesFromParam(param1) ?? 1
    return target.set(0, length / 2 - 0.25, 0)
  }
  if (definition.id === 'GEAR' && param1 === 'High Strength v2') {
    // Onshape HS v2 gears sit on the z=0 face and are 0.25" thick.
    return target.set(0, 0, 0.125)
  }
  return target.set(0, 0, 0)
}

function catalogToOnshape(definition: PartDefinition, param1: string) {
  if (definition.id === 'CCHL') return CATALOG_TO_ONSHAPE.extrusion
  if (definition.id === 'ANGL') return CATALOG_TO_ONSHAPE.angle
  if (definition.id === 'UCHL') return CATALOG_TO_ONSHAPE.uChannel
  if (definition.id === 'TANK') return CATALOG_TO_ONSHAPE.reservoir
  if (definition.id === 'RBMP') return CATALOG_TO_ONSHAPE.rubberBumper
  if (definition.id === 'CLMP' || (definition.id === 'SHFT' && param1 === 'High Strength')) {
    return CATALOG_TO_ONSHAPE.shaft
  }
  if (definition.id === 'SNDF') return CATALOG_TO_ONSHAPE.standoff
  return null
}

function catalogCenter(definition: PartDefinition, target: Vector3) {
  if (definition.id === 'UCHL') return target.copy(U_CHANNEL_CATALOG_CENTER)
  return target.set(0, 0, 0)
}

export function editorRotation(rotation: Quaternion): [number, number, number] {
  _euler.setFromQuaternion(rotation, 'XYZ')
  return [_euler.x, _euler.y, _euler.z]
}

export function alignCatalogPart(
  position: [number, number, number],
  sourceRotation: Quaternion,
  definition: PartDefinition,
  param1: string,
  param2: string,
) {
  const extra = catalogToOnshape(definition, param1)
  _catalogRotation.copy(sourceRotation)
  if (extra) _catalogRotation.multiply(extra)

  catalogOriginInOnshape(definition, param1, param2, _sourceCenter).applyQuaternion(sourceRotation)
  catalogCenter(definition, _catalogCenter).applyQuaternion(_catalogRotation)
  _position.set(...position).add(_sourceCenter).sub(_catalogCenter)

  return {
    position: _position.toArray() as [number, number, number],
    rotation: editorRotation(_catalogRotation),
  }
}

export function sourceQuaternion(basis: number[] | undefined, rotation: [number, number, number]) {
  if (basis && basis.length >= 9) {
    const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = basis
    return quatFromRows(m00, m01, m02, m10, m11, m12, m20, m21, m22)
  }
  return new Quaternion().setFromEuler(new Euler(
    rotation[0] * Math.PI / 180,
    rotation[1] * Math.PI / 180,
    rotation[2] * Math.PI / 180,
    'XYZ',
  ))
}
