import { BufferGeometry, type Mesh, type Object3D } from 'three'

export const CHANNEL_PROFILES = [2, 3, 5] as const
export type ChannelProfile = (typeof CHANNEL_PROFILES)[number]

export const MIN_HOLES = 1
export const MAX_HOLES = 35

export type ChannelPieces = Record<
  ChannelProfile,
  {
    endcap: BufferGeometry
    mid: BufferGeometry
    mid5: BufferGeometry
  }
>

const catalogCache = new Map<string, BufferGeometry>()

export function isChannelProfile(value: number): value is ChannelProfile {
  return value === 2 || value === 3 || value === 5
}

export function holeX(index: number, holeCount: number) {
  return 0.5 * ((-holeCount + 1) / 2 + index)
}

export function pieceForHole(
  pieces: ChannelPieces[ChannelProfile],
  hole: number,
): { geometry: BufferGeometry; flip: boolean } {
  if (hole === 1) return { geometry: pieces.endcap, flip: true }
  if (hole === MAX_HOLES) return { geometry: pieces.endcap, flip: false }
  if (hole % 5 === 0) return { geometry: pieces.mid5, flip: true }
  if ((hole - 1) % 5 === 0) return { geometry: pieces.mid5, flip: false }
  return { geometry: pieces.mid, flip: false }
}

export function catalogMeshName(profile: ChannelProfile, holes: number) {
  return `CCHL_1x${profile}x${holes}`
}

export function getCatalogGeometry(
  catalog: Map<string, BufferGeometry>,
  profile: ChannelProfile,
  holes: number,
) {
  const key = `${profile}x${holes}`
  const cached = catalogCache.get(key)
  if (cached) return cached

  const source = catalog.get(catalogMeshName(profile, holes))
  if (!source) return null

  const geometry = source.clone()
  catalogCache.set(key, geometry)
  return geometry
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

export function collectChannelPieces(root: Object3D): ChannelPieces {
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

  return {
    2: {
      endcap: pick('CCHL_1x2-Endcap'),
      mid: pick('CCHL_1x2-Mid'),
      mid5: pick('CCHL_1x2-Mid5'),
    },
    3: {
      endcap: pick('CCHL_1x3-Endcap'),
      mid: pick('CCHL_1x3-Mid'),
      mid5: pick('CCHL_1x3-Mid5'),
    },
    5: {
      endcap: pick('CCHL_1x5-Endcap'),
      mid: pick('CCHL_1x5-Mid'),
      mid5: pick('CCHL_1x5-Mid5'),
    },
  }
}
