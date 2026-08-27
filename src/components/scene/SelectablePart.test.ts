import { describe, expect, it } from 'vitest'
import { BoxGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector2, Vector3 } from 'three'
import { createOutlineMesh } from './outlineMesh'
import { projectedAxisDistance } from './projectedAxisDistance'

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

describe('keyboard axis movement', () => {
  it('maps horizontal pointer travel back onto the world X axis', () => {
    const camera = new PerspectiveCamera(50, 2, 0.1, 100)
    camera.position.set(0, 0, 10)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()

    const origin = new Vector3(0, 0, 0)
    const viewport = { width: 1000, height: 500 }
    const projectedOrigin = origin.clone().project(camera)
    const projectedUnitX = new Vector3(1, 0, 0).project(camera)
    const oneUnitInPixels = (projectedUnitX.x - projectedOrigin.x) * viewport.width / 2

    expect(projectedAxisDistance(
      camera,
      origin,
      new Vector3(1, 0, 0),
      new Vector2(oneUnitInPixels * 2, 0),
      viewport,
    )).toBeCloseTo(2)
  })
})
