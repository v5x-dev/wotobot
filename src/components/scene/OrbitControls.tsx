import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { OrbitControls as ThreeOrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Camera } from 'three'

/** OrbitControls dampingFactor is a per-frame lerp, authored against 60fps. */
const DAMPING_FPS = 60
const MAX_DELTA = 0.1

export function OrbitControls({
  makeDefault,
  camera,
  enableDamping = true,
  ...props
}: {
  makeDefault?: boolean
  camera?: Camera
  enableDamping?: boolean
  target?: [number, number, number]
  minDistance?: number
  maxDistance?: number
  mouseButtons?: ThreeOrbitControls['mouseButtons']
}) {
  const defaultCamera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const events = useThree((state) => state.events)
  const set = useThree((state) => state.set)
  const get = useThree((state) => state.get)
  const explCamera = camera ?? defaultCamera
  const explDomElement = (events.connected || gl.domElement) as HTMLElement
  const controls = useMemo(() => new ThreeOrbitControls(explCamera), [explCamera])

  useFrame((_, delta) => {
    if (!controls.enabled) return
    const dt = Math.min(Math.max(delta, 0), MAX_DELTA)
    const damping = controls.dampingFactor
    if (controls.enableDamping) {
      controls.dampingFactor = 1 - (1 - damping) ** (dt * DAMPING_FPS)
    }
    controls.update(dt)
    controls.dampingFactor = damping
  }, -1)

  useEffect(() => {
    controls.connect(explDomElement)
    return () => controls.dispose()
  }, [controls, explDomElement])

  useEffect(() => {
    if (!makeDefault) return
    const previous = get().controls
    set({ controls })
    return () => set({ controls: previous })
  }, [makeDefault, controls, get, set])

  return <primitive object={controls} enableDamping={enableDamping} {...props} />
}
