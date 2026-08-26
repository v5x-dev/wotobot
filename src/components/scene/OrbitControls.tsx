import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { OrbitControls as ThreeOrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Vector3, type Camera } from 'three'
import { createWheelNormalizer } from './wheelNormalization'

/** OrbitControls dampingFactor is a per-frame lerp, authored against 60fps. */
const DAMPING_FPS = 60
const MAX_DELTA = 0.1
const CAMERA_SAVE_DELAY_MS = 120
const KEYBOARD_MOVE_SPEED = 0.8
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD'])

type NormalizedWheelEvent = Pick<WheelEvent, 'clientX' | 'clientY' | 'deltaY'>
type OrbitControlsWheelInternals = {
  _customWheelEvent: (event: WheelEvent) => NormalizedWheelEvent
}

function preserveTrackpadPinchPrecision(controls: ThreeOrbitControls) {
  const internals = controls as unknown as OrbitControlsWheelInternals
  const normalizeWheelEvent = internals._customWheelEvent.bind(controls)
  const normalizeInput = createWheelNormalizer()
  internals._customWheelEvent = (event) => (
    normalizeWheelEvent(normalizeInput(event))
  )
}

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
  zoomToCursor = true,
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
  zoomToCursor?: boolean
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
  const invalidate = useThree((state) => state.invalidate)
  const explCamera = camera ?? defaultCamera
  const explDomElement = (events.connected || gl.domElement) as HTMLElement
  const onEndRef = useRef(onEnd)
  const pressedMoveKeys = useRef(new Set<string>())
  const movement = useRef({ forward: new Vector3(), right: new Vector3(), offset: new Vector3() })
  const [controls] = useState(() => {
    const next = new ThreeOrbitControls(explCamera)
    preserveTrackpadPinchPrecision(next)
    return next
  })

  useLayoutEffect(() => {
    setCamera(controls, explCamera)
  }, [controls, explCamera])

  useFrame((_, delta) => {
    const keys = pressedMoveKeys.current
    if (keys.size > 0) {
      const vectors = movement.current
      explCamera.getWorldDirection(vectors.forward)
      vectors.right.setFromMatrixColumn(explCamera.matrixWorld, 0)
      vectors.offset.set(0, 0, 0)
      if (keys.has('KeyW')) vectors.offset.add(vectors.forward)
      if (keys.has('KeyS')) vectors.offset.sub(vectors.forward)
      if (keys.has('KeyD')) vectors.offset.add(vectors.right)
      if (keys.has('KeyA')) vectors.offset.sub(vectors.right)
      if (vectors.offset.lengthSq() > 0) {
        const speed = Math.max(controls.object.position.distanceTo(controls.target), 0.5)
          * KEYBOARD_MOVE_SPEED * Math.min(delta, MAX_DELTA)
        vectors.offset.normalize().multiplyScalar(speed)
        controls.object.position.add(vectors.offset)
        controls.target.add(vectors.offset)
        invalidate()
      }
    }
    updateWithFrameRateIndependentDamping(controls, delta)
  }, -1)

  useEffect(() => {
    controls.connect(explDomElement)
    return () => controls.dispose()
  }, [controls, explDomElement])

  useEffect(() => {
    const stopMoving = () => {
      pressedMoveKeys.current.clear()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!MOVE_KEYS.has(event.code)) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return
      pressedMoveKeys.current.add(event.code)
      event.preventDefault()
      invalidate()
    }
    const onKeyUp = (event: KeyboardEvent) => {
      pressedMoveKeys.current.delete(event.code)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', stopMoving)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', stopMoving)
    }
  }, [invalidate])

  useEffect(() => {
    const renderNextFrame = () => invalidate()
    controls.addEventListener('change', renderNextFrame)
    return () => controls.removeEventListener('change', renderNextFrame)
  }, [controls, invalidate])

  useEffect(() => {
    onEndRef.current = onEnd
  }, [onEnd])

  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleSave = () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        onEndRef.current?.({
          target: controls.target.toArray() as [number, number, number],
          position: controls.object.position.toArray() as [number, number, number],
        })
      }, CAMERA_SAVE_DELAY_MS)
    }
    controls.addEventListener('end', scheduleSave)
    return () => {
      clearTimeout(saveTimer)
      controls.removeEventListener('end', scheduleSave)
    }
  }, [controls])

  useEffect(() => {
    if (!makeDefault) return
    const previous = get().controls
    set({ controls })
    return () => set({ controls: previous })
  }, [makeDefault, controls, get, set])

  return (
    <primitive
      object={controls}
      enableDamping={enableDamping}
      zoomToCursor={zoomToCursor}
      {...props}
    />
  )
}
