import { describe, expect, it } from 'vitest'
import { createWheelNormalizer } from './wheelNormalization'

function wheelEvent(overrides: Partial<WheelEvent> = {}) {
  return {
    clientX: 120,
    clientY: 80,
    ctrlKey: false,
    deltaMode: 0,
    deltaY: -1.5,
    timeStamp: 0,
    ...overrides,
  } as WheelEvent
}

describe('createWheelNormalizer', () => {
  it('removes the modifier that makes OrbitControls multiply pinch deltas by ten', () => {
    const event = wheelEvent({ ctrlKey: true })

    expect(createWheelNormalizer()(event)).toMatchObject({
      clientX: 120,
      clientY: 80,
      ctrlKey: false,
      deltaMode: 0,
      deltaY: -1.5,
    })
  })

  it('leaves mouse wheel events unchanged', () => {
    const event = wheelEvent()

    expect(createWheelNormalizer()(event)).toBe(event)
  })

  it('keeps zoom-to-cursor fixed for the duration of a pinch', () => {
    const normalize = createWheelNormalizer()

    normalize(wheelEvent({ ctrlKey: true, clientX: 120, clientY: 80, timeStamp: 10 }))
    const next = normalize(wheelEvent({ ctrlKey: true, clientX: 128, clientY: 75, timeStamp: 40 }))

    expect(next).toMatchObject({ clientX: 120, clientY: 80 })
  })

  it('uses a new anchor after the previous pinch ends', () => {
    const normalize = createWheelNormalizer()

    normalize(wheelEvent({ ctrlKey: true, clientX: 120, clientY: 80, timeStamp: 10 }))
    const next = normalize(wheelEvent({ ctrlKey: true, clientX: 200, clientY: 160, timeStamp: 200 }))

    expect(next).toMatchObject({ clientX: 200, clientY: 160 })
  })

  it('starts a new pinch when the browser timestamp resets', () => {
    const normalize = createWheelNormalizer()

    normalize(wheelEvent({ ctrlKey: true, clientX: 120, clientY: 80, timeStamp: 100 }))
    const next = normalize(wheelEvent({ ctrlKey: true, clientX: 200, clientY: 160, timeStamp: 0 }))

    expect(next).toMatchObject({ clientX: 200, clientY: 160 })
  })

  it('starts a new pinch after a regular wheel event', () => {
    const normalize = createWheelNormalizer()

    normalize(wheelEvent({ ctrlKey: true, clientX: 120, clientY: 80, timeStamp: 10 }))
    normalize(wheelEvent({ ctrlKey: false, timeStamp: 20 }))
    const next = normalize(wheelEvent({ ctrlKey: true, clientX: 200, clientY: 160, timeStamp: 30 }))

    expect(next).toMatchObject({ clientX: 200, clientY: 160 })
  })
})
