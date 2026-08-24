import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'

export function FpsCounter({
  target,
  triangleTarget,
}: {
  target: RefObject<HTMLElement | null>
  triangleTarget: RefObject<HTMLElement | null>
}) {
  const frames = useRef(0)
  const last = useRef<number | null>(null)
  const renderer = useThree((state) => state.gl)

  useEffect(() => {
    const previousAutoReset = renderer.info.autoReset
    // The HUD performs a second render pass, so Three's per-render reset would
    // discard the main scene statistics before this counter reads them.
    // eslint-disable-next-line react/immutability
    renderer.info.autoReset = false
    return () => {
      renderer.info.autoReset = previousAutoReset
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
    if (target.current) target.current.textContent = `${fps} FPS`
    if (triangleTarget.current) {
      const triangles = gl.info.render.triangles
      triangleTarget.current.textContent = `${triangles.toLocaleString()} ${triangles === 1 ? 'triangle' : 'triangles'}`
    }
  }, 2)

  return null
}
