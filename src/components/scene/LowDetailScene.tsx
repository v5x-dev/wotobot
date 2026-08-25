import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { BatchedMesh, BufferGeometry, Mesh } from 'three'
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js'

const TRIANGLE_RATIO = 0.25
const MINIMUM_TRIANGLES_TO_SIMPLIFY = 200

type SimplifiedMesh = {
  mesh: Mesh
  original: BufferGeometry
  simplified: BufferGeometry
}

function triangleCount(geometry: BufferGeometry) {
  return (geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3
}

function makeLowDetailGeometry(geometry: BufferGeometry) {
  const triangles = triangleCount(geometry)
  if (triangles < MINIMUM_TRIANGLES_TO_SIMPLIFY) return null

  const vertexCount = geometry.attributes.position?.count ?? 0
  const verticesToRemove = Math.floor(vertexCount * (1 - TRIANGLE_RATIO))
  if (verticesToRemove < 1) return null

  const simplified = new SimplifyModifier().modify(geometry, verticesToRemove)
  simplified.name = `${geometry.name || 'mesh'} (low detail)`
  simplified.computeBoundingBox()
  simplified.computeBoundingSphere()
  return simplified
}

/** Swaps rendered meshes to disposable, reduced copies without changing document data. */
export function LowDetailScene({ enabled }: { enabled: boolean }) {
  const scene = useThree((state) => state.scene)
  const changed = useRef(new Map<Mesh, SimplifiedMesh>())

  useEffect(() => {
    if (enabled) return
    for (const entry of changed.current.values()) {
      if (entry.mesh.geometry === entry.simplified) entry.mesh.geometry = entry.original
      entry.simplified.dispose()
    }
    changed.current.clear()
  }, [enabled])

  useEffect(() => () => {
    for (const entry of changed.current.values()) {
      if (entry.mesh.geometry === entry.simplified) entry.mesh.geometry = entry.original
      entry.simplified.dispose()
    }
    changed.current.clear()
  }, [])

  useFrame(() => {
    if (!enabled) return
    scene.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh || mesh instanceof BatchedMesh || changed.current.has(mesh)) return
      if (mesh.userData.isHoleOverlay || mesh.userData.isSelectionOutline) return
      if (Array.isArray(mesh.material) && mesh.material.length > 1) return

      const simplified = makeLowDetailGeometry(mesh.geometry)
      if (!simplified) return
      const entry = { mesh, original: mesh.geometry, simplified }
      changed.current.set(mesh, entry)
      mesh.geometry = simplified
    })

    for (const [mesh, entry] of changed.current) {
      if (mesh.parent) continue
      entry.simplified.dispose()
      changed.current.delete(mesh)
    }
  })

  return null
}
