import { describe, expect, it } from 'vitest'
import { BoxGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial } from 'three'
import { createOutlineMesh } from './outlineMesh'

describe('selection outlines', () => {
  it('keeps every instance when outlining an instanced part', () => {
    const geometry = new BoxGeometry()
    const material = new MeshBasicMaterial()
    const source = new InstancedMesh(geometry, material, 3)
    source.setMatrixAt(0, new Matrix4().makeTranslation(-1, 0, 0))
    source.setMatrixAt(1, new Matrix4().makeTranslation(0, 0, 0))
    source.setMatrixAt(2, new Matrix4().makeTranslation(1, 0, 0))

    const outline = createOutlineMesh(source, geometry, material)

    expect(outline).toBeInstanceOf(InstancedMesh)
    expect((outline as InstancedMesh).count).toBe(3)
    expect(Array.from((outline as InstancedMesh).instanceMatrix.array)).toEqual(
      Array.from(source.instanceMatrix.array),
    )

    geometry.dispose()
    material.dispose()
  })

  it('keeps ordinary mesh outlines ordinary', () => {
    const geometry = new BoxGeometry()
    const material = new MeshBasicMaterial()
    const outline = createOutlineMesh(new Mesh(geometry, material), geometry, material)

    expect(outline).toBeInstanceOf(Mesh)
    expect(outline).not.toBeInstanceOf(InstancedMesh)

    geometry.dispose()
    material.dispose()
  })
})
