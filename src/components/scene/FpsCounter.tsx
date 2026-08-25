import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector2, type WebGLRenderer } from 'three'
import { collectPartTriangles, formatPartTriangleOverlay } from './partTriangles'

function setAutoReset(renderer: WebGLRenderer, value: boolean) {
  renderer.info.autoReset = value
}

export function FpsCounter({
  onFpsChange,
  onTriangleChange,
  onDrawCallChange,
  onPartTrianglesChange,
  onPerformanceChange,
}: {
  onFpsChange: (label: string) => void
  onTriangleChange: (label: string) => void
  onDrawCallChange: (label: string) => void
  onPartTrianglesChange: (label: string) => void
  onPerformanceChange: (label: string) => void
}) {
  const frames = useRef(0)
  const last = useRef<number | null>(null)
  const previousFrame = useRef<number | null>(null)
  const frameTimes = useRef<number[]>([])
  const longTasks = useRef(0)
  const renderer = useThree((state) => state.gl)

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return
    const observer = new PerformanceObserver((list) => {
      longTasks.current += list.getEntries().length
    })
    try {
      observer.observe({ type: 'longtask', buffered: true })
    } catch {
      return
    }
    return () => observer.disconnect()
  }, [])

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
    if (previousFrame.current != null) {
      const frameTime = now - previousFrame.current
      if (frameTime > 100) {
        frames.current = 1
        last.current = now
        frameTimes.current = []
      } else {
        frameTimes.current.push(frameTime)
        if (frameTimes.current.length > 180) frameTimes.current.shift()
      }
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

    const samples = frameTimes.current
    const sorted = [...samples].sort((a, b) => a - b)
    const average = samples.reduce((total, value) => total + value, 0) / Math.max(samples.length, 1)
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0
    const worst = sorted.at(-1) ?? 0
    const missed = samples.filter((value) => value > 1000 / 60).length
    const missedPercent = Math.round((missed / Math.max(samples.length, 1)) * 100)
    const bufferSize = gl.getDrawingBufferSize(new Vector2())
    const memory = gl.info.memory
    const nav = navigator as Navigator & { deviceMemory?: number }
    const heap = performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number }
    }
    const heapLabel = heap.memory
      ? `JS heap ${Math.round(heap.memory.usedJSHeapSize / 1048576)}/${Math.round(heap.memory.jsHeapSizeLimit / 1048576)} MB\n`
      : ''
    onPerformanceChange(
      `frame ${average.toFixed(1)} ms · p95 ${p95.toFixed(1)} · worst ${worst.toFixed(1)}\n` +
      `over budget ${missedPercent}% · long tasks/sample ${longTasks.current}\n` +
      `${bufferSize.x}×${bufferSize.y} px · DPR ${gl.getPixelRatio().toFixed(2)}\n` +
      `${memory.geometries} geometries · ${memory.textures} textures · ${gl.info.programs?.length ?? 0} programs\n` +
      heapLabel +
      `${navigator.hardwareConcurrency ?? '?'} threads · ${nav.deviceMemory ?? '?'} GB RAM`,
    )
    longTasks.current = 0
  }, 2)

  return null
}
