import { describe, expect, it } from 'vitest'
import { modelScaleFor } from './modelScale'

describe('modelScaleFor', () => {
  it('converts millimeter-authored catalog models to editor inches', () => {
    expect(modelScaleFor('Shafts and Hardware/Wheels/V2OmniWheels.fbx')).toBeCloseTo(1 / 25.4)
    expect(modelScaleFor('Electronics/5.5WMotor.fbx')).toBeCloseTo(1 / 25.4)
    expect(modelScaleFor('Shafts and Hardware/HSBlockBearing.fbx')).toBeCloseTo(1 / 25.4)
    expect(modelScaleFor('Shafts and Hardware/LSandCollarBearing.fbx')).toBeCloseTo(1 / 25.4)
  })

  it('leaves the inch-authored 2.75-inch V2 omni wheel mesh unchanged', () => {
    expect(modelScaleFor(
      'Shafts and Hardware/Wheels/V2OmniWheels.fbx',
      '275 (220mm Travel) Omni-Directional Anti-Static Wheel',
    )).toBe(1)
  })

  it('converts meter-authored catalog models to editor inches', () => {
    expect(modelScaleFor('Shafts and Hardware/shaftcollar.fbx')).toBeCloseTo(39.37007874015748)
    expect(modelScaleFor('pnmatics/NewRes.fbx')).toBeCloseTo(39.37007874015748)
  })

  it('leaves inch-authored models unchanged', () => {
    expect(modelScaleFor('Shafts and Hardware/Wheels/Flex Wheels.fbx')).toBe(1)
    expect(modelScaleFor('Electronics/Motor.fbx')).toBe(1)
  })
})
