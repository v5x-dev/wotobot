import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { InstancedMesh, Mesh, type WebGLRenderer } from 'three'
import { findPart, type PlacedPart } from '@/model/parts'

function meshTriangles(mesh: Mesh) {
  const geometry = mesh.geometry
  const vertexCount = geometry.index?.count ?? geometry.attributes.position?.count ?? 0
  return Math.floor(vertexCount / 3) * (mesh instanceof InstancedMesh ? mesh.count : 1)
}

function modelLabel(part: PlacedPart) {
  const definition = findPart(part.key)
  return definition?.name ?? 'Unknown model'
}

function setAutoReset(renderer: WebGLRenderer, value: boolean) {
  renderer.info.autoReset = value
}

export function FpsCounter({
  onFpsChange,
  onTriangleChange,
  onModelTrianglesChange,
  parts,
}: {
  onFpsChange: (label: string) => void
  onTriangleChange: (label: string) => void
  onModelTrianglesChange: (rows: string[]) => void
  parts: PlacedPart[]
}) {
  const frames = useRef(0)
  const last = useRef<number | null>(null)
  const renderer = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    const previousAutoReset = renderer.info.autoReset
    // The HUD performs a second render pass, so Three's per-render reset would
    // discard the main scene statistics before this counter reads them.
    setAutoReset(renderer, false)
    return () => {
      setAutoReset(renderer, previousAutoReset)
    }
  }, [renderer])

  useFrame(({ gl }) => {
    gl.info.reset()
  }, -100)

  useFrame(({ gl }) => {
    frames.current += 1
    const now = performance.now()
    if (last.current == null) {
      last.current = now
      return
    }
    const elapsed = now - last.current
    if (elapsed < 500) return
    const fps = Math.round((frames.current * 1000) / elapsed)
    frames.current = 0
    last.current = now
    onFpsChange(`${fps} FPS`)
    const triangles = gl.info.render.triangles
    onTriangleChange(
      `${triangles.toLocaleString()} ${triangles === 1 ? 'triangle' : 'triangles'}`,
    )
    const trianglesByInstance = new Map<number, number>()
      scene.traverse((object) => {
        const instanceId = object.userData.debugModelInstanceId
        if (typeof instanceId !== 'number') return
        let triangles = 0
        object.traverse((child) => {
          if (child instanceof Mesh) triangles += meshTriangles(child)
        })
        trianglesByInstance.set(instanceId, triangles)
      })
      const partById = new Map(parts.map((part) => [part.instanceId, part]))
      const trianglesByPart = new Map<string, { part: PlacedPart; triangles: number }>()
      for (const [instanceId, triangles] of trianglesByInstance) {
        const part = partById.get(instanceId)
        if (!part) continue
        const total = trianglesByPart.get(part.key)
        trianglesByPart.set(part.key, {
          part,
          triangles: (total?.triangles ?? 0) + triangles,
        })
      }
      const topModels = [...trianglesByPart.values()]
        .sort((a, b) => b.triangles - a.triangles)
        .slice(0, 5)
    onModelTrianglesChange(
      topModels.map(
        ({ part, triangles }, index) =>
          `${index + 1}. ${modelLabel(part)} · ${triangles.toLocaleString()}`,
      ),
    )
  }, 2)

  return null
}
