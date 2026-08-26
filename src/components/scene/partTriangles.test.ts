import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial } from 'three'
import {
  collectPartTriangles,
  collectPartTriangleCount,
  formatPartTriangleOverlay,
  formatTris,
  meshTriangleCount,
  pluralizePartName,
} from './partTriangles'

function triangles(count: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 9), 3))
  return geometry
}

function partGroup(kind: string, ...meshes: Mesh[]) {
  const group = new Group()
  group.userData.partKind = kind
  for (const mesh of meshes) group.add(mesh)
  return group
}

describe('part triangle overlay', () => {
  it('pluralizes part names and formats compact triangle counts', () => {
    expect(pluralizePartName('C-Channel')).toBe('C-Channels')
    expect(pluralizePartName('Reservoir')).toBe('Reservoirs')
    expect(pluralizePartName('Gussets')).toBe('Gussets')
    expect(formatTris(150_000)).toBe('150k tris')
    expect(formatTris(50_000)).toBe('50k tris')
    expect(formatTris(1500)).toBe('1.5k tris')
    expect(formatTris(1)).toBe('1 tri')
    expect(formatTris(12)).toBe('12 tris')
  })

  it('counts instanced meshes and skips overlays', () => {
    const material = new MeshBasicMaterial()
    const instances = new InstancedMesh(triangles(10), material, 4)
    expect(meshTriangleCount(instances)).toBe(40)

    const root = new Group()
    const channels = partGroup('C-Channel', new Mesh(triangles(100), material))
    const holes = new Mesh(triangles(8), material)
    holes.userData.skipOutline = true
    channels.add(holes)
    const outline = new Mesh(triangles(100), material)
    outline.userData.isOutline = true
    channels.children[0].add(outline)

    const reservoirs = partGroup('Reservoir', new Mesh(triangles(20), material))
    const preview = partGroup('C-Channel', new Mesh(triangles(999), material))
    preview.userData.preview = true

    root.add(channels, reservoirs, preview, new Mesh(triangles(50), material))

    const stats = collectPartTriangles(root)
    expect(stats).toEqual([
      { name: 'C-Channel', triangles: 100 },
      { name: 'Reservoir', triangles: 20 },
    ])
    expect(formatPartTriangleOverlay(stats)).toBe('C-Channels: 100 tris\nReservoirs: 20 tris')
  })

  it('counts annotated batched parts alongside instanced part groups', () => {
    const material = new MeshBasicMaterial()
    const root = new Group()
    const instances = partGroup('Motor', new InstancedMesh(triangles(12), material, 3))
    const batch = new Mesh(triangles(100), material)
    batch.userData.partTriangleTotals = { 'C-Channel': 40, Angle: 20 }
    root.add(instances, batch)

    expect(collectPartTriangles(root)).toEqual([
      { name: 'C-Channel', triangles: 40 },
      { name: 'Motor', triangles: 36 },
      { name: 'Angle', triangles: 20 },
    ])
  })

  it('counts meshes belonging to one selected part', () => {
    const material = new MeshBasicMaterial()
    const root = new Group()
    const selected = partGroup('Motor', new Mesh(triangles(12), material), new Mesh(triangles(8), material))
    selected.userData.partId = 42
    const other = partGroup('Motor', new Mesh(triangles(30), material))
    other.userData.partId = 43
    root.add(selected, other)

    expect(collectPartTriangleCount(root, 42)).toBe(20)
    expect(collectPartTriangleCount(root, null)).toBeNull()
  })
})
