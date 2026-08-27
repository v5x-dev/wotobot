import type { PartDefinition } from '@/model/parts'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

const MILLIMETERS_TO_INCHES = 1 / 25.4
const X_AXIS = new Vector3(1, 0, 0)

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

function rx(turns: number) {
  return new Quaternion().setFromAxisAngle(X_AXIS, turns * Math.PI)
}

/**
 * Maps catalog local axes onto the Onshape VEX library part CS.
 * Columns of the matrix are catalog X/Y/Z expressed in Onshape coordinates.
 */
const CATALOG_TO_ONSHAPE = {
  extrusion: quatFromRows(
    0, 1, 0,
    0, 0, -1,
    -1, 0, 0,
  ),
  angle: quatFromRows(
    0, 0, -1,
    0, 1, 0,
    1, 0, 0,
  ),
  plusX: rx(0.5),
  minusX: rx(-0.5),
  uChannel: rx(-0.5),
  brain: rx(0.5),
  reservoir: rx(0.5),
  rubberBumper: rx(1),
  shaft: quatFromRows(
    0, 0, 1,
    1, 0, 0,
    0, 1, 0,
  ),
  standoff: rx(-0.5),
}

const U_CHANNEL_ONSHAPE_CENTER = new Vector3(-3.5, -0.4455, 0)
const U_CHANNEL_CATALOG_CENTER = new Vector3(0, -0.008, -0.477)
const SHAFT_COLLAR_ONSHAPE_CENTER = new Vector3(4.2806, 5.6968, 7.9749).multiplyScalar(MILLIMETERS_TO_INCHES)
const RUBBER_BUMPER_ONSHAPE_CENTER = new Vector3(-0.143, 0, 0)
const HINGE_ONSHAPE_CENTER = new Vector3(-0.25, 0, -0.044)

function inchesFromParam(value: string) {
  const normalized = value.trim().replace(/in$/i, '')
  const mixed = normalized.match(/^(\d+)-(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const fraction = normalized.match(/^(\d+)\/(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  const inches = Number(normalized)
  return Number.isFinite(inches) ? inches : undefined
}

function isCouplerChannel(param1: string, param2: string) {
  return param1 === 'Coupler' && param2 === 'Channel'
}

function catalogOriginInOnshape(
  definition: PartDefinition,
  param1: string,
  param2: string,
  target: Vector3,
) {
  if (definition.id === 'CCHL') {
    const holes = Number(param2)
    return Number.isFinite(holes) ? target.set(0, 0.052, -holes * 0.25) : target.set(0, 0, 0)
  }
  if (definition.id === 'ANGL') {
    const holes = Number(param2)
    if (!Number.isFinite(holes)) return target.set(0, 0, 0)
    const along = -(holes - 1) * 0.25
    if (param1 === '2x2') return target.set(0.204, 0.5, along)
    if (param1 === '3x3') return target.set(-0.002, 0.044, along)
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
  if (definition.id === 'GEAR' && param1 === 'High Strength v2' && param2 === '48T') {
    return target.set(0, 0, 0.125)
  }
  if (definition.id === 'RBMP') return target.copy(RUBBER_BUMPER_ONSHAPE_CENTER)
  if (definition.id === 'HING') return target.copy(HINGE_ONSHAPE_CENTER)
  return target.set(0, 0, 0)
}

function catalogToOnshape(definition: PartDefinition, param1: string, param2: string) {
  if (definition.id === 'CCHL') return CATALOG_TO_ONSHAPE.extrusion
  if (definition.id === 'ANGL') return CATALOG_TO_ONSHAPE.angle
  if (definition.id === 'UCHL') return CATALOG_TO_ONSHAPE.uChannel
  if (definition.id === 'BRAN') return CATALOG_TO_ONSHAPE.brain
  if (definition.id === 'TANK') return CATALOG_TO_ONSHAPE.reservoir
  if (definition.id === 'RBMP') return CATALOG_TO_ONSHAPE.rubberBumper
  if (definition.id === 'CLMP' || (definition.id === 'SHFT' && param1 === 'High Strength')) {
    return CATALOG_TO_ONSHAPE.shaft
  }
  if (definition.id === 'SNDF') return CATALOG_TO_ONSHAPE.standoff
  if (definition.id === 'SCRW') return CATALOG_TO_ONSHAPE.plusX
  if (definition.id === 'NUT' && param1 === 'Lock') return CATALOG_TO_ONSHAPE.plusX
  if (definition.id === 'BTRY') return CATALOG_TO_ONSHAPE.minusX
  if (definition.id === 'BRNG' && param1 === 'Low Profile') return CATALOG_TO_ONSHAPE.minusX
  if (definition.id === 'GSET' && isCouplerChannel(param1, param2)) return CATALOG_TO_ONSHAPE.minusX
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

function brainEditorRotation(rotation: Quaternion): [number, number, number] {
  const [x, y, z] = editorRotation(rotation)
  if (Math.abs(y + Math.PI / 2) > 1e-6) return [x, y, z]

  const degrees = Math.round((z - x) * 180 / Math.PI)
  return [0, -Math.PI / 2, degrees * Math.PI / 180]
}

export function alignCatalogPart(
  position: [number, number, number],
  sourceRotation: Quaternion,
  definition: PartDefinition,
  param1: string,
  param2: string,
) {
  const extra = catalogToOnshape(definition, param1, param2)
  _catalogRotation.copy(sourceRotation)
  if (extra) _catalogRotation.multiply(extra)

  catalogOriginInOnshape(definition, param1, param2, _sourceCenter).applyQuaternion(sourceRotation)
  catalogCenter(definition, _catalogCenter).applyQuaternion(_catalogRotation)
  _position.set(...position).add(_sourceCenter).sub(_catalogCenter)

  return {
    position: [_position.x, _position.y, _position.z] as [number, number, number],
    rotation: definition.id === 'BRAN'
      ? brainEditorRotation(_catalogRotation)
      : editorRotation(_catalogRotation),
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
