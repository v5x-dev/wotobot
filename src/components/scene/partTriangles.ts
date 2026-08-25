import { Mesh, type Object3D } from 'three'

export type PartTriangleStat = {
  name: string
  triangles: number
}

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh
}

function isInstancedMesh(mesh: Mesh): mesh is Mesh & { isInstancedMesh: true; count: number } {
  return 'isInstancedMesh' in mesh && (mesh as Mesh & { isInstancedMesh?: boolean }).isInstancedMesh === true
}

export function meshTriangleCount(mesh: Mesh) {
  const { geometry } = mesh
  const index = geometry.index
  const tris = index
    ? Math.floor(index.count / 3)
    : Math.floor((geometry.getAttribute('position')?.count ?? 0) / 3)
  return isInstancedMesh(mesh) ? tris * mesh.count : tris
}

function skipMesh(object: Object3D) {
  const { userData } = object
  return Boolean(userData.isOutline || userData.skipOutline || userData.holeKind || userData.preview)
}

function partKindOf(object: Object3D) {
  let current: Object3D | null = object
  while (current) {
    if (current.userData.preview) return null
    const kind = current.userData.partKind
    if (typeof kind === 'string' && kind) return kind
    current = current.parent
  }
  return null
}

export function pluralizePartName(name: string) {
  if (/s$/i.test(name)) return name
  return `${name}s`
}

export function formatTris(count: number) {
  if (count >= 1000) {
    const k = count / 1000
    const rounded = k >= 10 ? Math.round(k) : Math.round(k * 10) / 10
    const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
    return `${label}k tris`
  }
  return `${count.toLocaleString()} ${count === 1 ? 'tri' : 'tris'}`
}

export function collectPartTriangles(root: Object3D) {
  const totals = new Map<string, number>()
  root.traverse((object) => {
    if (!isMesh(object) || skipMesh(object)) return
    const kind = partKindOf(object)
    if (!kind) return
    totals.set(kind, (totals.get(kind) ?? 0) + meshTriangleCount(object))
  })
  return [...totals.entries()]
    .map(([name, triangles]) => ({ name, triangles }))
    .filter((entry) => entry.triangles > 0)
    .sort((a, b) => b.triangles - a.triangles || a.name.localeCompare(b.name))
}

export function formatPartTriangleOverlay(stats: PartTriangleStat[]) {
  return stats
    .map((entry) => `${pluralizePartName(entry.name)}: ${formatTris(entry.triangles)}`)
    .join('\n')
}
