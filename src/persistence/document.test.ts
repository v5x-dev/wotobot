import { describe, expect, it } from 'vitest'
import { makePart } from '@/test/fixtures'
import {
  DEFAULT_CAMERA,
  DOCUMENT_VERSION,
  parseDocument,
  serializeDocument,
  type CameraState,
} from './document'

describe('robot documents', () => {
  it('round trips parts, chains, camera, and custom polycarbonate shapes', () => {
    const sprocketA = makePart('SPKT', { instanceId: 1, position: [1, 2, 3] })
    const sprocketB = makePart('SPKT', { instanceId: 2, position: [3, 2, 3] })
    const polycarbonate = makePart('POLY', {
      instanceId: 3,
      color: [0.1, 0.2, 0.3],
      groupId: 7,
      shape: {
        kind: 'polygon',
        thickness: 0.0625,
        points: [[-1, -1], [1, -1], [0, 1]],
        holes: [[0, 0]],
      },
    })
    const camera: CameraState = { target: [1, 2, 3], position: [4, 5, 6], ortho: true }
    const text = serializeDocument(
      [sprocketA, sprocketB, polycarbonate],
      camera,
      [{ id: 4, sprocketAId: 1, sprocketBId: 2 }],
    )

    expect(JSON.parse(text).version).toBe(DOCUMENT_VERSION)
    expect(parseDocument(text)).toEqual({
      parts: [sprocketA, sprocketB, polycarbonate],
      chains: [{ id: 4, sprocketAId: 1, sprocketBId: 2 }],
      camera,
    })
  })

  it('loads the old top-level array format and supplies newer defaults', () => {
    const legacy = makePart('CCHL', { instanceId: 9 })
    const { rotation: _rotation, color: _color, ...oldPart } = legacy
    expect(parseDocument(JSON.stringify([oldPart]))).toEqual({
      parts: [{ ...legacy, rotation: [0, 0, 0], color: null }],
      chains: [],
      camera: DEFAULT_CAMERA,
    })
  })

  it.each([
    ['invalid JSON', '{'],
    ['unrecognized root', '{}'],
    ['invalid part', JSON.stringify([{ instanceId: 1 }])],
    ['duplicate part ids', JSON.stringify([makePart('SPKT'), makePart('SPKT')])],
    ['invalid chain endpoint', JSON.stringify({ parts: [makePart('CCHL')], chains: [{ id: 1, sprocketAId: 1, sprocketBId: 2 }] })],
  ])('rejects %s', (_label, text) => {
    expect(() => parseDocument(text)).toThrow()
  })
})
