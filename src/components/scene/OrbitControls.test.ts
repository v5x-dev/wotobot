import { describe, expect, it } from 'vitest'
import { withoutTrackpadPinchAcceleration } from './wheelNormalization'

function wheelEvent(overrides: Partial<WheelEvent> = {}) {
  return {
    clientX: 120,
    clientY: 80,
    ctrlKey: false,
    deltaMode: 0,
    deltaY: -1.5,
    ...overrides,
  } as WheelEvent
}

describe('withoutTrackpadPinchAcceleration', () => {
  it('removes the modifier that makes OrbitControls multiply pinch deltas by ten', () => {
    const event = wheelEvent({ ctrlKey: true })

    expect(withoutTrackpadPinchAcceleration(event)).toMatchObject({
      clientX: 120,
      clientY: 80,
      ctrlKey: false,
      deltaMode: 0,
      deltaY: -1.5,
    })
  })

  it('leaves mouse wheel events unchanged', () => {
    const event = wheelEvent()

    expect(withoutTrackpadPinchAcceleration(event)).toBe(event)
  })
})
