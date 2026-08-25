import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from 'three'
import {
  assembleLinearSplitGeometry,
  assembleChannelGeometry,
  getAssembledChannelGeometry,
  getAssembledLinearSplitGeometry,
  pieceForLinearHole,
  pieceForHole,
  withoutChannelSeamFaces,
  type ChannelPieces,
  type LinearSplitPieces,
} from './channelGeometry'

function geometryWithEndFaces() {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([
    -0.25, 0, 0, -0.25, 1, 0, -0.25, 0, 1,
    0.25, 0, 0, 0.25, 0, 1, 0.25, 1, 0,
    -0.25, 0, 0, 0.25, 0, 0, -0.25, 1, 0,
  ], 3))
  return geometry
}

describe('assembled channel geometry', () => {
  it('removes coincident internal end faces', () => {
    expect(withoutChannelSeamFaces(geometryWithEndFaces()).getAttribute('position').count).toBe(3)
    expect(withoutChannelSeamFaces(geometryWithEndFaces(), true).getAttribute('position').count).toBe(6)
  })

  it('uses end caps and mid5 pieces at the requested channel length', () => {
    const endcap = new BufferGeometry()
    const mid = new BufferGeometry()
    const mid5 = new BufferGeometry()
    const single = new BufferGeometry()
    const pieces = { single, endcap, mid, mid5 } satisfies ChannelPieces[2]

    expect(pieceForHole(pieces, 1, 1)).toEqual({ geometry: single, flip: false })
    expect(pieceForHole(pieces, 1, 17)).toEqual({ geometry: endcap, flip: false })
    expect(pieceForHole(pieces, 17, 17)).toEqual({ geometry: endcap, flip: true })
    expect(pieceForHole(pieces, 4, 7)).toEqual({ geometry: mid, flip: true })
    expect(pieceForHole(pieces, 5, 7)).toEqual({ geometry: mid5, flip: false })
    expect(pieceForHole(pieces, 6, 7)).toEqual({ geometry: mid5, flip: true })
  })

  it('builds the requested seven-hole piece sequence', () => {
    const endcap = new BufferGeometry()
    const mid = new BufferGeometry()
    const mid5 = new BufferGeometry()
    const single = new BufferGeometry()
    const pieces = { single, endcap, mid, mid5 } satisfies ChannelPieces[2]

    expect(Array.from({ length: 7 }, (_, index) => pieceForHole(pieces, index + 1, 7).geometry)).toEqual([
      endcap,
      mid,
      mid,
      mid,
      mid5,
      mid5,
      endcap,
    ])

    expect(Array.from({ length: 7 }, (_, index) => pieceForHole(pieces, index + 1, 7).flip)).toEqual([
      false,
      true,
      true,
      true,
      false,
      true,
      true,
    ])
  })

  it('uses regular mid pieces when Mid5 is disabled', () => {
    const endcap = new BufferGeometry()
    const mid = new BufferGeometry()
    const mid5 = new BufferGeometry()
    const single = new BufferGeometry()
    const pieces = { single, endcap, mid, mid5 } satisfies ChannelPieces[2]

    expect(Array.from({ length: 7 }, (_, index) => pieceForHole(pieces, index + 1, 7, false).geometry)).toEqual([
      endcap,
      mid,
      mid,
      mid,
      mid,
      mid,
      endcap,
    ])
  })

  it('preserves normals while merging fallback geometry', () => {
    const source = geometryWithEndFaces()
    source.computeVertexNormals()
    const pieces = { single: source, endcap: source, mid: source, mid5: source } satisfies ChannelPieces[2]
    const geometry = assembleChannelGeometry(pieces, 1)
    const position = geometry.getAttribute('position')
    const normal = geometry.getAttribute('normal')
    const a = new Vector3()
    const b = new Vector3()
    const c = new Vector3()
    const face = new Vector3()
    const vertexNormal = new Vector3()

    for (let index = 0; index < position.count; index += 3) {
      a.fromBufferAttribute(position, index)
      b.fromBufferAttribute(position, index + 1)
      c.fromBufferAttribute(position, index + 2)
      face.subVectors(b, a).cross(c.clone().sub(a)).normalize()
      for (let vertex = index; vertex < index + 3; vertex += 1) {
        vertexNormal.fromBufferAttribute(normal, vertex)
        expect(face.dot(vertexNormal)).toBeGreaterThan(0.99)
      }
    }
  })

  it('builds every hole from split pieces for noncatalog lengths', () => {
    const source = geometryWithEndFaces()
    const pieces = { single: source, endcap: source, mid: source, mid5: source } satisfies ChannelPieces[2]
    const geometry = assembleChannelGeometry(pieces, 7)

    expect(geometry.getAttribute('position').count).toBe(source.getAttribute('position').count * 7)
  })

  it('reuses assembled geometry for matching pieces and hole counts', () => {
    const source = geometryWithEndFaces()
    const pieces = { single: source, endcap: source, mid: source, mid5: source } satisfies ChannelPieces[2]

    expect(getAssembledChannelGeometry(pieces, 7)).toBe(getAssembledChannelGeometry(pieces, 7))
    expect(getAssembledChannelGeometry(pieces, 8)).not.toBe(getAssembledChannelGeometry(pieces, 7))
  })

  it('uses the paired Mid5 pieces for other split model families', () => {
    const start = new BufferGeometry()
    const end = new BufferGeometry()
    const mid = new BufferGeometry()
    const mid5Start = new BufferGeometry()
    const mid5End = new BufferGeometry()
    const pieces = { start, end, mid, mid5Start, mid5End } satisfies LinearSplitPieces

    expect(Array.from({ length: 7 }, (_, index) => pieceForLinearHole(pieces, index + 1, 7))).toEqual([
      end,
      mid,
      mid,
      mid,
      mid5End,
      mid5Start,
      start,
    ])
  })

  it('uses regular mid pieces in other split model families when Mid5 is disabled', () => {
    const start = new BufferGeometry()
    const end = new BufferGeometry()
    const mid = new BufferGeometry()
    const pieces = {
      start,
      end,
      mid,
      mid5Start: new BufferGeometry(),
      mid5End: new BufferGeometry(),
    } satisfies LinearSplitPieces

    expect(Array.from({ length: 7 }, (_, index) => pieceForLinearHole(pieces, index + 1, 7, false))).toEqual([
      end,
      mid,
      mid,
      mid,
      mid,
      mid,
      start,
    ])
  })

  it('merges other split model families into one geometry', () => {
    const source = geometryWithEndFaces()
    const pieces = {
      start: source,
      end: source,
      mid: source,
      mid5Start: source,
      mid5End: source,
    } satisfies LinearSplitPieces
    const geometry = assembleLinearSplitGeometry(pieces, 7)

    expect(geometry.getAttribute('position').count).toBe(source.getAttribute('position').count * 7)
  })

  it('reuses assembled linear geometry for matching models and hole counts', () => {
    const root = new Mesh(geometryWithEndFaces())
    root.name = 'piece'
    const names = { start: 'piece', end: 'piece', mid: 'piece', mid5Start: 'piece', mid5End: 'piece' }

    expect(getAssembledLinearSplitGeometry(root, names, 7)).toBe(
      getAssembledLinearSplitGeometry(root, names, 7),
    )
    expect(getAssembledLinearSplitGeometry(root, names, 8)).not.toBe(
      getAssembledLinearSplitGeometry(root, names, 7),
    )
  })
})
