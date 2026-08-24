import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useState } from 'react'
import { OrbitControls as ThreeOrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Camera } from 'three'

/** OrbitControls dampingFactor is a per-frame lerp, authored against 60fps. */
const DAMPING_FPS = 60
const MAX_DELTA = 0.1

function setCamera(controls: ThreeOrbitControls, camera: Camera) {
  controls.object = camera
  controls.update()
}

function updateWithFrameRateIndependentDamping(controls: ThreeOrbitControls, delta: number) {
  if (!controls.enabled) return
  const dt = Math.min(Math.max(delta, 0), MAX_DELTA)
  const damping = controls.dampingFactor
  if (controls.enableDamping) {
    controls.dampingFactor = 1 - (1 - damping) ** (dt * DAMPING_FPS)
  }
  controls.update(dt)
  controls.dampingFactor = damping
}

export function OrbitControls({
  makeDefault,
  camera,
  enableDamping = true,
  onEnd,
  ...props
}: {
  makeDefault?: boolean
  camera?: Camera
  enableDamping?: boolean
  target?: [number, number, number]
  minDistance?: number
  maxDistance?: number
  mouseButtons?: ThreeOrbitControls['mouseButtons']
  onEnd?: (state: {
    target: [number, number, number]
    position: [number, number, number]
  }) => void
}) {
  const defaultCamera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const events = useThree((state) => state.events)
  const set = useThree((state) => state.set)
  const get = useThree((state) => state.get)
  const explCamera = camera ?? defaultCamera
  const explDomElement = (events.connected || gl.domElement) as HTMLElement
  const [controls] = useState(() => new ThreeOrbitControls(explCamera))

  useLayoutEffect(() => {
    setCamera(controls, explCamera)
  }, [controls, explCamera])

  useFrame((_, delta) => {
    updateWithFrameRateIndependentDamping(controls, delta)
  }, -1)

  useEffect(() => {
    controls.connect(explDomElement)
    return () => controls.dispose()
  }, [controls, explDomElement])

  useEffect(() => {
    if (!onEnd) return
    const report = () => onEnd({
      target: controls.target.toArray() as [number, number, number],
      position: controls.object.position.toArray() as [number, number, number],
    })
    controls.addEventListener('end', report)
    return () => controls.removeEventListener('end', report)
  }, [controls, onEnd])

  useEffect(() => {
    if (!makeDefault) return
    const previous = get().controls
    set({ controls })
    return () => set({ controls: previous })
  }, [makeDefault, controls, get, set])

  return <primitive object={controls} enableDamping={enableDamping} {...props} />
}
