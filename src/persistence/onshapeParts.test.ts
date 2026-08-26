import { describe, expect, it } from 'vitest'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { stepMetadataToParts } from './onshapeParts'
import type { StepMetadata } from './stepMetadataParser'

const metadata: StepMetadata = {
  schema: null,
  units: 'meter',
  parts: [
    { instanceId: '1', productId: 'channel', name: '1 x 3 x 1 x 20 Aluminum C-Channel (276-4359)', kind: 'part', path: [], position: [0.0254, 0.0508, 0.0762], rotation: [0, 0, 0] },
    { instanceId: '2', productId: 'motor', name: 'V5 Smart Motor (6:1) (276-4840)', kind: 'part', path: [], position: [0.0254, 0.0508, 0.0762], rotation: [45, 25, 80], basis: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
    { instanceId: '3', productId: 'gear', name: '60T High Strength Gear V2 (276-7748)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
    { instanceId: '4', productId: 'unknown', name: 'Part 1', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
    { instanceId: '5', productId: 'angle', name: '1 x 1 x 24 Aluminum Angle (276-6484)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
    { instanceId: '6', productId: 'omni', name: '2.75" Anti-Static Omni-Directional Wheel (220mm Travel) (276-8106)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
    { instanceId: '7', productId: 'sensor', name: 'Rotation Sensor (276-6050)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
    { instanceId: '8', productId: 'angle-2x2', name: '2 x 2 x 5 Aluminum Angle (276-2304)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0], basis: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
    { instanceId: '9', productId: 'shaft', name: '10.1" High Strength Shaft (276-7465)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0], basis: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
    { instanceId: '10', productId: 'collar', name: 'Shaft Collar (276-2010)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
    { instanceId: '11', productId: 'spacer', name: '1/16" High Strength Shaft Spacer (276-3441)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
  ],
}

describe('stepMetadataToParts', () => {
  it('maps catalog parts and converts STEP units and angles', () => {
    const result = stepMetadataToParts(metadata)
    expect(result.parts).toHaveLength(10)
    expect(result.parts[0]).toMatchObject({ key: 'Structure:CCHL:C-Channel', param1: '1x3', param2: '20' })
    expect(result.parts[0].onshapeName).toBe('1 x 3 x 1 x 20 Aluminum C-Channel (276-4359)')
    expect(result.parts[0].position[0]).toBeCloseTo(0.975)
    expect(result.parts[0].position[1]).toBeCloseTo(2.052)
    expect(result.parts[0].position[2]).toBeCloseTo(-0.625)
    expect(result.parts[0].rotation[0]).toBeCloseTo(Math.PI / 2)
    expect(result.parts[0].rotation[1]).toBeCloseTo(0)
    expect(result.parts[0].rotation[2]).toBeCloseTo(-Math.PI / 2)
    expect(result.parts[1]).toMatchObject({ key: 'Electronics:MOTR:Motor', param1: '11W' })
    expect(result.parts[1].position[0]).toBeCloseTo(0.975)
    expect(result.parts[1].position[1]).toBeCloseTo(2)
    expect(result.parts[1].position[2]).toBeCloseTo(4.375)
    expect(result.parts[1].rotation[0]).toBeCloseTo(0)
    expect(result.parts[1].rotation[1]).toBeCloseTo(0)
    expect(result.parts[1].rotation[2]).toBeCloseTo(0)
    expect(result.parts[2]).toMatchObject({ key: 'Motion:GEAR:Gear', param1: 'High Strength v2', param2: '60T', color: null })
    expect(result.parts[3]).toMatchObject({ key: 'Structure:ANGL:Angle', param1: '1x1', param2: '24' })
    expect(result.parts[4]).toMatchObject({ key: 'Motion:OMNI:Omni Wheel', param1: 'V2', param2: '2.75in' })
    expect(result.parts[5]).toMatchObject({ key: 'Electronics:SNSR:Sensor', param1: 'Rotation', param2: 'V5' })
    expect(result.parts[6]).toMatchObject({ key: 'Structure:ANGL:Angle', param1: '2x2', param2: '5' })
    expect(result.parts[6].position[0]).toBeCloseTo(0.2246)
    expect(result.parts[6].position[1]).toBeCloseTo(0.046)
    expect(result.parts[6].position[2]).toBeCloseTo(0.372432)
    const angleLengthAxis = new Vector3(1, 0, 0).applyEuler(new Euler(...result.parts[6].rotation))
    expect(angleLengthAxis.x).toBeCloseTo(0)
    expect(angleLengthAxis.y).toBeCloseTo(0)
    expect(angleLengthAxis.z).toBeCloseTo(1)
    expect(result.parts[7]).toMatchObject({ key: 'Motion:SHFT:Shaft', param1: 'High Strength', param2: '10.1' })
    expect(result.parts[7].position[0]).toBeCloseTo(-0.975)
    expect(result.parts[7].position[1]).toBeCloseTo(0)
    expect(result.parts[7].position[2]).toBeCloseTo(1.375)
    const shaftAxis = new Vector3(0, 0, 1).applyEuler(new Euler(...result.parts[7].rotation))
    expect(shaftAxis.x).toBeCloseTo(1)
    expect(shaftAxis.y).toBeCloseTo(0)
    expect(shaftAxis.z).toBeCloseTo(0)
    const shaftUp = new Vector3(0, 1, 0).applyEuler(new Euler(...result.parts[7].rotation))
    expect(shaftUp.x).toBeCloseTo(0)
    expect(shaftUp.y).toBeCloseTo(0)
    expect(shaftUp.z).toBeCloseTo(1)
    expect(result.parts[8]).toMatchObject({ key: 'Motion:CLMP:Shaft Collar', param1: 'Normal', param2: 'Normal' })
    expect(result.parts[9]).toMatchObject({ key: 'Motion:SPCR:Spacer', param1: 'High Strength', param2: '1/16in' })
    expect(result.skipped.map((part) => part.name)).toEqual(['Part 1'])
  })

  it('keeps a rotated Onshape shaft on its source x axis and moves its center', () => {
    const sourceRotation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 5)
    const matrix = new Matrix4().makeRotationFromQuaternion(sourceRotation)
    const elements = matrix.elements
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        {
          instanceId: '1',
          productId: 'shaft',
          name: '10.5" High Strength Shaft (276-7465)',
          kind: 'part',
          path: [],
          position: [6, 2, 3],
          rotation: [36, 0, 0],
          basis: [
            elements[0], elements[4], elements[8],
            elements[1], elements[5], elements[9],
            elements[2], elements[6], elements[10],
          ],
        },
        {
          instanceId: '2',
          productId: 'motor',
          name: 'V5 Smart Motor',
          kind: 'part',
          path: [],
          position: [6, 2, 3],
          rotation: [0, 0, 0],
        },
      ],
    })

    const shaft = result.parts[0]
    const axis = new Vector3(0, 0, 1).applyEuler(new Euler(...shaft.rotation))
    expect(axis.x).toBeCloseTo(1)
    expect(axis.y).toBeCloseTo(0)
    expect(axis.z).toBeCloseTo(0)
    expect(shaft.position).toEqual([-0.375, 0, 0])
    expect(result.parts[1].position).toEqual([0.375, 0, 0])
  })

  it('aligns a shaft collar bore with the Onshape source x axis', () => {
    const sourceRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 3)
    const matrix = new Matrix4().makeRotationFromQuaternion(sourceRotation)
    const elements = matrix.elements
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        {
          instanceId: 'collar',
          productId: '276-2010',
          name: 'Shaft Collar (276-2010)',
          kind: 'part',
          path: [],
          position: [2, 3, 4],
          rotation: [0, 0, 60],
          basis: [
            elements[0], elements[4], elements[8],
            elements[1], elements[5], elements[9],
            elements[2], elements[6], elements[10],
          ],
        },
      ],
    })

    const collar = result.parts[0]
    const boreAxis = new Vector3(0, 0, 1).applyEuler(new Euler(...collar.rotation))
    const sourceXAxis = new Vector3(1, 0, 0).applyQuaternion(sourceRotation)
    expect(boreAxis.x).toBeCloseTo(sourceXAxis.x)
    expect(boreAxis.y).toBeCloseTo(sourceXAxis.y)
    expect(boreAxis.z).toBeCloseTo(sourceXAxis.z)
    expect(collar.position).toEqual([0, 0, 0])
  })

  it('moves the shaft collar from its Onshape origin to its geometry center', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'millimeter',
      parts: [
        {
          instanceId: 'collar',
          productId: '276-2010',
          name: 'Shaft Collar (276-2010)',
          kind: 'part',
          path: [],
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          basis: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        },
        {
          instanceId: 'motor',
          productId: 'motor',
          name: 'V5 Smart Motor',
          kind: 'part',
          path: [],
          position: [0, 0, 0],
          rotation: [0, 0, 0],
        },
      ],
    })

    const collar = result.parts[0]
    const motor = result.parts[1]
    expect(collar.position[0] - motor.position[0]).toBeCloseTo(4.2806 / 25.4)
    expect(collar.position[1] - motor.position[1]).toBeCloseTo(5.6968 / 25.4)
    expect(collar.position[2] - motor.position[2]).toBeCloseTo(7.9749 / 25.4)
  })

  it('imports standard shafts at their stated length along the source z axis', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        {
          instanceId: '1',
          productId: 'standard-shaft',
          name: '8.5" Standard Shaft (276-1149)',
          kind: 'part',
          path: [],
          position: [7.12, 16.48, -7.17],
          rotation: [0, 0, 0],
          basis: [0, 0, -1, 0, -1, 0, -1, 0, 0],
        },
        {
          instanceId: '2',
          productId: 'motor',
          name: 'V5 Smart Motor',
          kind: 'part',
          path: [],
          position: [7.12, 16.48, -7.17],
          rotation: [0, 0, 0],
        },
      ],
    })

    const shaft = result.parts[0]
    expect(shaft).toMatchObject({ param1: 'Normal', param2: '8.5' })
    const axis = new Vector3(0, 0, 1).applyEuler(new Euler(...shaft.rotation))
    expect(axis.x).toBeCloseTo(-1)
    expect(axis.y).toBeCloseTo(0)
    expect(axis.z).toBeCloseTo(0)
    expect(shaft.position[0]).toBeCloseTo(-0.875)
    expect(result.parts[1].position[0]).toBeCloseTo(0.875)
  })

  it('aligns an Onshape U-channel profile and preserves its hole count', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        {
          instanceId: 'u-channel',
          productId: '276-7285',
          name: '2 x 2 x 2 x 6 Aluminum U-Channel (276-7285)',
          kind: 'part',
          path: [],
          position: [4, 2, 7],
          rotation: [-90, 0, 0],
          basis: [1, 0, 0, 0, 0, 1, 0, -1, 0],
        },
        { instanceId: 'motor', productId: 'motor', name: 'V5 Smart Motor', kind: 'part', path: [], position: [4, 2, 7], rotation: [0, 0, 0] },
      ],
    })

    const channel = result.parts[0]
    expect(channel).toMatchObject({
      key: 'Structure:UCHL:U-Channel',
      param1: '2x2',
      param2: '6',
    })
    expect(channel.rotation[0]).toBeCloseTo(-Math.PI)
    expect(channel.rotation[1]).toBeCloseTo(0)
    expect(channel.rotation[2]).toBeCloseTo(0)
    const motor = result.parts[1]
    expect(channel.position[0] - motor.position[0]).toBeCloseTo(-3.5)
    expect(channel.position[1] - motor.position[1]).toBeCloseTo(-0.008)
    expect(channel.position[2] - motor.position[2]).toBeCloseTo(-0.0315)
  })

  it('aligns an imported rubber bumper with its mounting axis', () => {
    const sourceAngle = -83.9043 * Math.PI / 180
    const sourceRotation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), sourceAngle)
    const matrix = new Matrix4().makeRotationFromQuaternion(sourceRotation)
    const elements = matrix.elements
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        {
          instanceId: 'bumper',
          productId: '276-7499',
          name: 'Rubber Bumper (276-7499)',
          kind: 'part',
          path: [],
          position: [0, 0, 0],
          rotation: [-83.9043, 0, 0],
          basis: [
            elements[0], elements[4], elements[8],
            elements[1], elements[5], elements[9],
            elements[2], elements[6], elements[10],
          ],
        },
      ],
    })

    const bumper = result.parts[0]
    expect(bumper).toMatchObject({ key: 'Motion:RBMP:Rubber Bumper' })
    expect(bumper.rotation[0]).toBeCloseTo(sourceAngle + Math.PI)
    expect(bumper.rotation[1]).toBeCloseTo(0)
    expect(bumper.rotation[2]).toBeCloseTo(0)
  })

  it('centers imported positions and places the lowest point on the grid', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: '1', productId: 'motor-a', name: 'V5 Smart Motor', kind: 'part', path: [], position: [10, 4, 20], rotation: [0, 0, 0] },
        { instanceId: '2', productId: 'motor-b', name: 'V5 Smart Motor', kind: 'part', path: [], position: [14, 8, 26], rotation: [0, 0, 0] },
      ],
    })

    expect(result.parts.map((part) => part.position)).toEqual([
      [-2, 0, -3],
      [2, 4, 3],
    ])
  })

  it('uses user mappings for parts that cannot be matched by name', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'mystery-1', productId: 'custom', name: 'Mystery component', kind: 'part', path: [], position: [1, 2, 3], rotation: [0, 0, 0] },
      ],
    }, {
      'mystery-1': 'Electronics:MOTR:Motor',
    })

    expect(result.skipped).toEqual([])
    expect(result.parts[0]).toMatchObject({
      key: 'Electronics:MOTR:Motor',
      param1: '11W',
      position: [0, 0, 0],
    })
  })

  it('recognizes the Onshape 8T 6P sprocket as normal strength', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'sprocket-8t', productId: '276-8030', name: '8T Sprocket, 6P (276-8030)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    })

    expect(result.skipped).toEqual([])
    expect(result.parts[0]).toMatchObject({
      key: 'Motion:SPKT:Sprocket',
      param1: 'Normal',
      param2: '8T',
    })
  })

  it('recognizes the Onshape 16T 6P sprocket as normal strength', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'sprocket-16t', productId: '276-8328', name: '16T Sprocket, 6P (276-8328)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    })

    expect(result.skipped).toEqual([])
    expect(result.parts[0]).toMatchObject({
      key: 'Motion:SPKT:Sprocket',
      param1: 'Normal',
      param2: '16T',
    })
  })

  it('recognizes the Onshape 32T 6P sprocket as normal strength', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'sprocket-32t', productId: '276-8330', name: '32T Sprocket, 6P (276-8330)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    })

    expect(result.skipped).toEqual([])
    expect(result.parts[0]).toMatchObject({
      key: 'Motion:SPKT:Sprocket',
      param1: 'Normal',
      param2: '32T',
    })
  })

  it('recognizes a pneumatic cylinder rod as a known subcomponent', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'cylinder-rod', productId: '276', name: '25mm Stroke Pneumatic Cylinder Rod (276', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    })

    expect(result.parts).toEqual([])
    expect(result.skipped).toEqual([])
  })

  it('orients an Onshape standoff with the source frame instead of a palette default', () => {
    const sourceRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2)
    const matrix = new Matrix4().makeRotationFromQuaternion(sourceRotation)
    const elements = matrix.elements
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        {
          instanceId: 'standoff',
          productId: '276-2013',
          name: '1" Long #8-32 Standoff (276-2013)',
          kind: 'part',
          path: [],
          position: [2, 3, 4],
          rotation: [0, 0, 90],
          basis: [
            elements[0], elements[4], elements[8],
            elements[1], elements[5], elements[9],
            elements[2], elements[6], elements[10],
          ],
        },
      ],
    })

    const axis = new Vector3(0, 0, 1).applyEuler(new Euler(...result.parts[0].rotation))
    const sourceY = new Vector3(0, 1, 0).applyQuaternion(sourceRotation)
    expect(axis.x).toBeCloseTo(sourceY.x)
    expect(axis.y).toBeCloseTo(sourceY.y)
    expect(axis.z).toBeCloseTo(sourceY.z)
  })

  it('recognizes the Onshape 5.6 inch standoff', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'standoff-5.6', productId: '276-2013', name: '5.6" Long #8-32 Standoff (276-2013)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    })

    expect(result.skipped).toEqual([])
    expect(result.parts[0]).toMatchObject({
      key: 'Structure:SNDF:Standoff',
      param1: '5.6in',
    })
    expect(result.parts[0].rotation[0]).toBeCloseTo(-Math.PI / 2)
    expect(result.parts[0].rotation[1]).toBeCloseTo(0)
    expect(result.parts[0].rotation[2]).toBeCloseTo(0)
  })

  it('preserves arbitrary decimal and fractional standoff lengths', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'standoff-decimal', productId: 'custom', name: '3.25" Long #8-32 Standoff', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
        { instanceId: 'standoff-fraction', productId: 'custom', name: '2-1/2" Long #8-32 Standoff', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    })

    expect(result.skipped).toEqual([])
    expect(result.parts.map((part) => part.param1)).toEqual(['3.25in', '2-1/2in'])
  })

  it('recognizes the 2-1/2 inch star drive screw', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'screw-2.5', productId: '276-8016', name: '#8-32 x 2-1/2" Star Drive Screw (276-8016)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    })

    expect(result.skipped).toEqual([])
    expect(result.parts[0]).toMatchObject({
      key: 'Structure:SCRW:Screw',
      param1: '2.50in',
    })
  })

  it('recognizes the low profile bearing flat', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'bearing-flat', productId: '276-8023', name: 'Low Profile Bearing Flat (276-8023)', kind: 'part', path: [], position: [0, 0, 0], rotation: [0, 0, 0] },
      ],
    })

    expect(result.skipped).toEqual([])
    expect(result.parts[0]).toMatchObject({
      key: 'Motion:BRNG:Flat Bearing',
      param1: 'Low Profile',
    })
  })

  it('imports the three Onshape hinge components as one Wotobot hinge', () => {
    const result = stepMetadataToParts({
      schema: null,
      units: 'inch',
      parts: [
        { instanceId: 'hinge-1', productId: '', name: 'VEX-HINGE-1 RevA', kind: 'part', path: [], position: [1, 2, 3], rotation: [0, 0, 0] },
        { instanceId: 'hinge-2', productId: '', name: 'VEX-HINGE-2 RevA', kind: 'part', path: [], position: [1, 2, 3], rotation: [0, 0, 0] },
        { instanceId: 'hinge-pin', productId: '', name: 'VEX-HINGE-PIN', kind: 'part', path: [], position: [1, 2, 3], rotation: [0, 0, 0] },
      ],
    })

    expect(result.skipped).toEqual([])
    expect(result.parts).toHaveLength(1)
    expect(result.parts[0]).toMatchObject({
      key: 'Structure:HING:Hinge',
      position: [0, 0, 0],
    })
  })
})
