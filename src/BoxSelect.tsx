import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { PlacedPart } from './parts'

const MIN_DRAG = 5

export function BoxSelect({
  enabled,
  parts,
  onSelect,
}: {
  enabled: boolean
  parts: PlacedPart[]
  onSelect: (ids: number[]) => void
}) {
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const drag = useRef<{ x: number; y: number; holding: boolean } | null>(null)
  const holdingB = useRef(false)
  const partsRef = useRef(parts)
  const onSelectRef = useRef(onSelect)
  partsRef.current = parts
  onSelectRef.current = onSelect

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'b' && !event.ctrlKey && !event.metaKey) holdingB.current = true
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'b') holdingB.current = false
    }

    function onPointerDown(event: PointerEvent) {
      if (!enabled || event.button !== 0 || !holdingB.current) return
      drag.current = { x: event.clientX, y: event.clientY, holding: true }
      setBox({ x: event.clientX, y: event.clientY, w: 0, h: 0 })
    }

    function onPointerMove(event: PointerEvent) {
      if (!drag.current?.holding) return
      const x = Math.min(drag.current.x, event.clientX)
      const y = Math.min(drag.current.y, event.clientY)
      setBox({
        x,
        y,
        w: Math.abs(event.clientX - drag.current.x),
        h: Math.abs(event.clientY - drag.current.y),
      })
    }

    function onPointerUp(event: PointerEvent) {
      if (!drag.current?.holding) return
      const start = drag.current
      drag.current = null
      setBox(null)
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.hypot(dx, dy) < MIN_DRAG) return

      const rect = gl.domElement.getBoundingClientRect()
      const minX = Math.min(start.x, event.clientX) - rect.left
      const maxX = Math.max(start.x, event.clientX) - rect.left
      const minY = Math.min(start.y, event.clientY) - rect.top
      const maxY = Math.max(start.y, event.clientY) - rect.top
      const ids: number[] = []
      const projected = new Vector3()
      for (const part of partsRef.current) {
        projected.set(...part.position).project(camera)
        const sx = ((projected.x + 1) / 2) * rect.width
        const sy = ((-projected.y + 1) / 2) * rect.height
        if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) ids.push(part.instanceId)
      }
      if (ids.length > 0) onSelectRef.current(ids)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [camera, enabled, gl])

  if (!box) return null
  return createPortal(
    <div
      className="pointer-events-none fixed z-30 border border-sky-400 bg-sky-400/15"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    />,
    document.body,
  )
}
