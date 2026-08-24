import { describe, expect, it } from 'vitest'
import { Euler, Vector3 } from 'three'
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
    expect(result.parts[0]).toMatchObject({ position: [1, 2.052, -2] })
    expect(result.parts[0].rotation[0]).toBeCloseTo(Math.PI / 2)
    expect(result.parts[0].rotation[1]).toBeCloseTo(0)
    expect(result.parts[0].rotation[2]).toBeCloseTo(-Math.PI / 2)
    expect(result.parts[1]).toMatchObject({ key: 'Electronics:MOTR:Motor', param1: '11W' })
    expect(result.parts[1].position).toEqual([1, 2, 3])
    expect(result.parts[1].rotation[0]).toBeCloseTo(0)
    expect(result.parts[1].rotation[1]).toBeCloseTo(0)
    expect(result.parts[1].rotation[2]).toBeCloseTo(0)
    expect(result.parts[2]).toMatchObject({ key: 'Motion:GEAR:Gear', param1: 'High Strength v2', param2: '60T', color: null })
    expect(result.parts[3]).toMatchObject({ key: 'Structure:ANGL:Angle', param1: '1x1', param2: '24' })
    expect(result.parts[4]).toMatchObject({ key: 'Motion:OMNI:Omni Wheel', param1: 'V2', param2: '2.75in' })
    expect(result.parts[5]).toMatchObject({ key: 'Electronics:SNSR:Sensor', param1: 'Rotation', param2: 'V5' })
    expect(result.parts[6]).toMatchObject({ key: 'Structure:ANGL:Angle', param1: '2x2', param2: '5' })
    expect(result.parts[6].position[0]).toBeCloseTo(0.1576)
    expect(result.parts[6].position[1]).toBeCloseTo(0.046)
    expect(result.parts[6].position[2]).toBeCloseTo(-1.002568)
    expect(result.parts[7]).toMatchObject({ key: 'Motion:SHFT:Shaft', param1: 'High Strength', param2: '10.1' })
    expect(result.parts[7].position[0]).toBeCloseTo(-0.95)
    expect(result.parts[7].position[1]).toBeCloseTo(0)
    expect(result.parts[7].position[2]).toBeCloseTo(0)
    const shaftAxis = new Vector3(0, 0, 1).applyEuler(new Euler(...result.parts[7].rotation))
    expect(shaftAxis.x).toBeCloseTo(1)
    expect(shaftAxis.y).toBeCloseTo(0)
    expect(shaftAxis.z).toBeCloseTo(0)
    expect(result.parts[8]).toMatchObject({ key: 'Motion:CLMP:Shaft Collar', param1: 'Normal', param2: 'Normal' })
    expect(result.parts[9]).toMatchObject({ key: 'Motion:SPCR:Spacer', param1: 'High Strength', param2: '1/16in' })
    expect(result.skipped.map((part) => part.name)).toEqual(['Part 1'])
  })
})
