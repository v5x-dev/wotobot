import { InstancedMesh, Mesh, type BufferGeometry, type Material } from 'three'

export function createOutlineMesh(
  source: Mesh,
  geometry: BufferGeometry,
  material: Material,
) {
  const instancedSource = source as InstancedMesh
  if (!instancedSource.isInstancedMesh) return new Mesh(geometry, material)

  const outline = new InstancedMesh(geometry, material, instancedSource.count)
  outline.instanceMatrix.copy(instancedSource.instanceMatrix)
  outline.instanceMatrix.needsUpdate = true
  return outline
}
