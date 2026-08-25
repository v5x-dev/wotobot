import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { WebGLRenderer } from 'three'
import { collectPartTriangles, formatPartTriangleOverlay } from './partTriangles'

function setAutoReset(renderer: WebGLRenderer, value: boolean) {
  renderer.info.autoReset = value
}

export function FpsCounter({
  onFpsChange,
  onTriangleChange,
  onDrawCallChange,
  onPartTrianglesChange,
}: {
  onFpsChange: (label: string) => void
  onTriangleChange: (label: string) => void
  onDrawCallChange: (label: string) => void
  onPartTrianglesChange: (label: string) => void
}) {
  const frames = useRef(0)
  const last = useRef<number | null>(null)
  const previousFrame = useRef<number | null>(null)
  const renderer = useThree((state) => state.gl)

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

  useFrame(({ gl, scene }) => {
    frames.current += 1
    const now = performance.now()
    if (previousFrame.current != null && now - previousFrame.current > 100) {
      frames.current = 1
      last.current = now
    }
    previousFrame.current = now
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
    const calls = gl.info.render.calls
    onDrawCallChange(`${calls.toLocaleString()} ${calls === 1 ? 'draw call' : 'draw calls'}`)
    onPartTrianglesChange(formatPartTriangleOverlay(collectPartTriangles(scene)))
  }, 2)

  return null
}
