import { BufferGeometry, Float32BufferAttribute, type Mesh, type Object3D } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const CHANNEL_PROFILES = [2, 3, 5] as const
export type ChannelProfile = (typeof CHANNEL_PROFILES)[number]

export const MIN_HOLES = 1
export const MAX_HOLES = 35

export type ChannelPieces = Record<
  ChannelProfile,
  {
    single: BufferGeometry
    endcap: BufferGeometry
    mid: BufferGeometry
    mid5: BufferGeometry
  }
>

export type LinearSplitPieces = {
  start: BufferGeometry
  end: BufferGeometry
  mid: BufferGeometry
  mid5Start: BufferGeometry
  mid5End: BufferGeometry
}

const channelPiecesCache = new WeakMap<Object3D, ChannelPieces>()
const assembledChannelCache = new WeakMap<ChannelPieces[ChannelProfile], Map<string, BufferGeometry>>()
const assembledLinearSplitCache = new WeakMap<Object3D, Map<string, BufferGeometry>>()

export function isChannelProfile(value: number): value is ChannelProfile {
  return value === 2 || value === 3 || value === 5
}

export function holeX(index: number, holeCount: number) {
  return 0.5 * ((-holeCount + 1) / 2 + index)
}

export function pieceForHole(
  pieces: ChannelPieces[ChannelProfile],
  hole: number,
  holeCount: number,
  useMid5 = true,
): { geometry: BufferGeometry; flip: boolean } {
  if (holeCount === 1) return { geometry: pieces.single, flip: false }
  if (hole === 1) return { geometry: pieces.endcap, flip: false }
  if (hole === holeCount) return { geometry: pieces.endcap, flip: true }
  if (useMid5 && hole % 5 === 0) return { geometry: pieces.mid5, flip: false }
  if (useMid5 && hole % 5 === 1) return { geometry: pieces.mid5, flip: true }
  return { geometry: pieces.mid, flip: true }
}

export function withoutChannelSeamFaces(source: BufferGeometry, keepNegativeEnd = false) {
  const geometry = source.index ? source.toNonIndexed() : source.clone()
  const position = geometry.getAttribute('position')
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox
  if (!bounds) return geometry

  const epsilon = Math.max(1, bounds.max.x - bounds.min.x) * 1e-5
  const kept: number[] = []
  for (let index = 0; index < position.count; index += 3) {
    const x0 = position.getX(index)
    const x1 = position.getX(index + 1)
    const x2 = position.getX(index + 2)
    const onNegativeEnd = [x0, x1, x2].every((x) => Math.abs(x - bounds.min.x) <= epsilon)
    const onPositiveEnd = [x0, x1, x2].every((x) => Math.abs(x - bounds.max.x) <= epsilon)
    if ((onNegativeEnd && !keepNegativeEnd) || onPositiveEnd) continue
    kept.push(index, index + 1, index + 2)
  }

  const result = new BufferGeometry()
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const values = kept.flatMap((index) =>
      Array.from({ length: attribute.itemSize }, (_, component) => attribute.array[index * attribute.itemSize + component]),
    )
    result.setAttribute(name, new Float32BufferAttribute(values, attribute.itemSize, attribute.normalized))
  }
  result.userData = { ...geometry.userData }
  geometry.dispose()
  return result
}

export function assembleChannelGeometry(
  pieces: ChannelPieces[ChannelProfile],
  holeCount: number,
  useMid5 = true,
) {
  const transformed = Array.from({ length: holeCount }, (_, index) => {
    const { geometry: source, flip } = pieceForHole(pieces, index + 1, holeCount, useMid5)
    const geometry = source.clone()
    if (flip) geometry.rotateZ(Math.PI)
    geometry.translate(holeX(index, holeCount), 0, 0)
    return geometry
  })
  const merged = mergeGeometries(transformed)
  transformed.forEach((geometry) => geometry.dispose())
  if (!merged) throw new Error('Could not assemble C-channel geometry')
  return merged
}

export function getAssembledChannelGeometry(
  pieces: ChannelPieces[ChannelProfile],
  holeCount: number,
  useMid5 = true,
) {
  let geometries = assembledChannelCache.get(pieces)
  if (!geometries) {
    geometries = new Map()
    assembledChannelCache.set(pieces, geometries)
  }

  const key = `${holeCount}|${useMid5}`
  const cached = geometries.get(key)
  if (cached) return cached

  const geometry = assembleChannelGeometry(pieces, holeCount, useMid5)
  geometries.set(key, geometry)
  return geometry
}

export function pieceForLinearHole(
  pieces: LinearSplitPieces,
  hole: number,
  holeCount: number,
  useMid5 = true,
) {
  if (hole === 1) return pieces.end
  if (hole === holeCount) return pieces.start
  if (useMid5 && hole % 5 === 0) return pieces.mid5End
  if (useMid5 && hole % 5 === 1) return pieces.mid5Start
  return pieces.mid
}

export function assembleLinearSplitGeometry(
  pieces: LinearSplitPieces,
  holeCount: number,
  useMid5 = true,
) {
  const transformed = Array.from({ length: holeCount }, (_, index) => {
    const geometry = pieceForLinearHole(pieces, index + 1, holeCount, useMid5).clone()
    geometry.translate(holeX(index, holeCount), 0, 0)
    return geometry
  })
  const merged = mergeGeometries(transformed)
  transformed.forEach((geometry) => geometry.dispose())
  if (!merged) throw new Error('Could not assemble split geometry')
  return merged
}

export function indexCatalogMeshes(root: Object3D) {
  const meshes = new Map<string, BufferGeometry>()
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    meshes.set(mesh.name, mesh.geometry)
  })
  return meshes
}

export function collectLinearSplitPieces(
  root: Object3D,
  names: Record<keyof LinearSplitPieces, string>,
): LinearSplitPieces {
  const meshes = indexCatalogMeshes(root)
  const pick = (name: string) => {
    const geometry = meshes.get(name)
    if (!geometry) throw new Error(`Missing split piece ${name}`)
    return withoutChannelSeamFaces(geometry)
  }

  return {
    start: positiveEndPiece(meshes.get(names.start) ?? missingSplitPiece(names.start)),
    end: withoutChannelSeamFaces(meshes.get(names.end) ?? missingSplitPiece(names.end), true),
    mid: pick(names.mid),
    mid5Start: pick(names.mid5Start),
    mid5End: pick(names.mid5End),
  }
}

export function getAssembledLinearSplitGeometry(
  root: Object3D,
  names: Record<keyof LinearSplitPieces, string>,
  holeCount: number,
  useMid5 = true,
) {
  let geometries = assembledLinearSplitCache.get(root)
  if (!geometries) {
    geometries = new Map()
    assembledLinearSplitCache.set(root, geometries)
  }

  const key = `${names.start}|${names.end}|${names.mid}|${names.mid5Start}|${names.mid5End}|${holeCount}|${useMid5}`
  const cached = geometries.get(key)
  if (cached) return cached

  const geometry = assembleLinearSplitGeometry(collectLinearSplitPieces(root, names), holeCount, useMid5)
  geometries.set(key, geometry)
  return geometry
}

function missingSplitPiece(name: string): never {
  throw new Error(`Missing split piece ${name}`)
}

function positiveEndPiece(source: BufferGeometry) {
  const rotated = source.clone()
  rotated.rotateZ(Math.PI)
  const result = withoutChannelSeamFaces(rotated, true)
  result.rotateZ(Math.PI)
  rotated.dispose()
  return result
}

export function collectChannelPieces(root: Object3D): ChannelPieces {
  const cached = channelPiecesCache.get(root)
  if (cached) return cached

  const meshes = new Map<string, BufferGeometry>()
  root.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    meshes.set(mesh.name, mesh.geometry)
  })

  const pick = (name: string) => {
    const geometry = meshes.get(name)
    if (!geometry) throw new Error(`Missing C-channel piece ${name}`)
    geometry.computeBoundingBox()
    return geometry
  }

  const pieces: ChannelPieces = {
    2: {
      single: pick('CCHL_1x2-Endcap'),
      endcap: withoutChannelSeamFaces(pick('CCHL_1x2-Endcap'), true),
      mid: withoutChannelSeamFaces(pick('CCHL_1x2-Mid')),
      mid5: withoutChannelSeamFaces(pick('CCHL_1x2-Mid5')),
    },
    3: {
      single: pick('CCHL_1x3-Endcap'),
      endcap: withoutChannelSeamFaces(pick('CCHL_1x3-Endcap'), true),
      mid: withoutChannelSeamFaces(pick('CCHL_1x3-Mid')),
      mid5: withoutChannelSeamFaces(pick('CCHL_1x3-Mid5')),
    },
    5: {
      single: pick('CCHL_1x5-Endcap'),
      endcap: withoutChannelSeamFaces(pick('CCHL_1x5-Endcap'), true),
      mid: withoutChannelSeamFaces(pick('CCHL_1x5-Mid')),
      mid5: withoutChannelSeamFaces(pick('CCHL_1x5-Mid5')),
    },
  }
  channelPiecesCache.set(root, pieces)
  return pieces
}
