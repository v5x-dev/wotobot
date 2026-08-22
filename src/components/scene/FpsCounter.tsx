import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'

export function FpsCounter({ target }: { target: RefObject<HTMLElement | null> }) {
  const frames = useRef(0)
  const last = useRef<number | null>(null)

  useFrame(() => {
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
  })

  return null
}
