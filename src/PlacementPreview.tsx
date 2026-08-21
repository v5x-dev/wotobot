import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { BufferGeometry, DoubleSide, Group, Plane, Quaternion, Vector3, type Object3D } from 'three'
import { snapVec3 } from './grid'
import { eulerToQuat, quatToEuler } from './math'
import { holeFaceFromHit, snapPlacement, type HoleFace } from './placementSnap'
import { PlacedPartMesh } from './SceneParts'
import type { PlacedPart } from './parts'
import type { HoleTemplate } from './holes'

const DRAG_THRESHOLD = 4
const ground = new Plane(new Vector3(0, 1, 0), 0)
const hit = new Vector3()
const _forward = new Vector3()
const _quat = new Quaternion()
const _look = new Quaternion()
const _hitNormal = new Vector3()
const _rayEnd = new Vector3()

function isSceneTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('canvas') || target.closest('[data-slot="scene"]'))
  )
}

function toPending(part: PlacedPart) {
  return { key: part.key, param1: part.param1, param2: part.param2 }
}

function readHole(object: Object3D) {
  if (object.userData.holeKind !== 'hole' || !object.userData.hole || object.userData.partId == null) {
    return null
  }
  return {
    hole: object.userData.hole as HoleTemplate,
    partId: object.userData.partId as number,
    parent: object.parent,
  }
}

export function PlacementPreview({
  part,
  parts,
  flip,
  rotating,
  debugHoles,
  onPlace,
  onRotation,
}: {
  part: PlacedPart | null
  parts: PlacedPart[]
  flip: boolean
  rotating: boolean
  debugHoles: boolean
  onPlace: (
    position: [number, number, number],
    rotation: [number, number, number],
    pending: Pick<PlacedPart, 'key' | 'param1' | 'param2'>,
  ) => void
  onRotation: (rotation: [number, number, number]) => void
}) {
  const groupRef = useRef<Group>(null)
  const partRef = useRef(part)
  const partsRef = useRef(parts)
  const flipRef = useRef(flip)
  const rotatingRef = useRef(rotating)
  const onPlaceRef = useRef(onPlace)
  const onRotationRef = useRef(onRotation)
  const rotationRef = useRef<[number, number, number]>(part?.rotation ?? [0, 0, 0])
  const poseRef = useRef({
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
  })
  const rotateStart = useRef<{ x: number; y: number; quat: Quaternion } | null>(null)
  const faceRef = useRef<Group>(null)
  const rayHitRef = useRef<Group>(null)
  const rayGeometryRef = useRef<BufferGeometry>(null)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const raycaster = useThree((state) => state.raycaster)

  partRef.current = part
  partsRef.current = parts
  flipRef.current = flip
  rotatingRef.current = rotating
  if (part) rotationRef.current = part.rotation

  useEffect(() => {
    onPlaceRef.current = onPlace
    onRotationRef.current = onRotation
  }, [onPlace, onRotation])

  useFrame(({ camera: frameCamera, pointer }) => {
    const current = partRef.current
    const group = groupRef.current
    if (!current || !group) return
    raycaster.setFromCamera(pointer, frameCamera)

    if (rotatingRef.current) {
      if (!rotateStart.current) {
        rotateStart.current = {
          x: pointer.x,
          y: pointer.y,
          quat: eulerToQuat(rotationRef.current, new Quaternion()),
        }
        return
      }
      const degrees =
        Math.round(
          ((Math.atan2(pointer.y, pointer.x) - Math.atan2(rotateStart.current.y, rotateStart.current.x)) *
            180) /
            Math.PI /
            22.5,
        ) * 22.5
      _forward.set(0, 0, 1).applyQuaternion(rotateStart.current.quat)
      const camDot = _forward.dot(frameCamera.getWorldDirection(new Vector3()))
      _look.setFromAxisAngle(_forward.clone().multiplyScalar(-Math.sign(camDot) || -1), (degrees * Math.PI) / 180)
      const next = _look.multiply(rotateStart.current.quat.clone())
      const euler = quatToEuler(next)
      group.quaternion.copy(next)
      poseRef.current.rotation = euler
      onRotationRef.current(euler)
      return
    }
    rotateStart.current = null

    if (!raycaster.ray.intersectPlane(ground, hit)) return
    const groundPoint = snapVec3(hit.x, 0, hit.z)

    const hits = raycaster.intersectObject(scene, true)
    let holeFace: HoleFace | null = null
    let hoverPart: PlacedPart | null = null
    let hoverPoint: Vector3 | null = null
    for (const item of hits) {
      if (group.getObjectById(item.object.id) || item.object.userData.isOutline) continue
      const hole = readHole(item.object)
      if (hole) {
        // Raycast face normals are local to the collider. Convert them before
        // comparing them with the hole's world-space axis.
        const hitNormal = item.face
          ? _hitNormal.copy(item.face.normal).transformDirection(item.object.matrixWorld)
          : hole.parent?.getWorldDirection(_hitNormal) ?? _hitNormal.set(0, 0, 1)
        const worldForward = hole.parent
          ? hole.parent.getWorldDirection(new Vector3())
          : new Vector3(0, 0, 1)
        const worldPosition = hole.parent
          ? hole.parent.getWorldPosition(new Vector3())
          : item.point.clone()
        holeFace = holeFaceFromHit(
          {
            ...hole.hole,
            partId: hole.partId,
            worldPosition,
            worldForward,
          },
          hitNormal,
          flipRef.current,
        )
        hoverPart = partsRef.current.find((placed) => placed.instanceId === hole.partId) ?? null
        hoverPoint = item.point
        break
      }
    }

    if (debugHoles && rayGeometryRef.current) {
      _rayEnd.copy(raycaster.ray.direction).multiplyScalar(100).add(raycaster.ray.origin)
      rayGeometryRef.current.setFromPoints([
        raycaster.ray.origin,
        hoverPoint ?? _rayEnd,
      ])
      if (rayHitRef.current) {
        if (hoverPoint) rayHitRef.current.position.copy(hoverPoint)
        else rayHitRef.current.position.set(...groundPoint)
      }
    }

    const snapped = snapPlacement({
      pending: current,
      holeFace,
      hoverPart,
      hoverPoint,
      groundPoint,
      currentRotation: rotationRef.current,
      flip: flipRef.current,
    })
    group.position.set(...snapped.position)
    eulerToQuat(snapped.modifyRotation ? snapped.rotation : rotationRef.current, _quat)
    group.quaternion.copy(_quat)
    poseRef.current = {
      position: snapped.position,
      rotation: snapped.modifyRotation ? snapped.rotation : rotationRef.current,
    }

    if (faceRef.current) {
      if (holeFace) {
        faceRef.current.visible = true
        faceRef.current.position.copy(holeFace.position)
        faceRef.current.quaternion.copy(holeFace.lookRotation)
        faceRef.current.scale.set(holeFace.hole.size[0], holeFace.hole.size[1], 1)
      } else {
        faceRef.current.visible = false
      }
    }
  })

  useEffect(() => {
    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let dragged = false
    let pending: ReturnType<typeof toPending> | null = null

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || !isSceneTarget(event.target)) return
      const current = partRef.current
      if (!current) return
      pointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
      dragged = false
      pending = toPending(current)
    }

    function onPointerMove(event: PointerEvent) {
      if (pointerId !== event.pointerId) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) dragged = true
    }

    function onPointerUp(event: PointerEvent) {
      if (pointerId !== event.pointerId) return
      pointerId = null
      const toPlace = pending
      pending = null
      if (event.button !== 0 || dragged || !toPlace || rotatingRef.current) return
      onPlaceRef.current(poseRef.current.position, poseRef.current.rotation, toPlace)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [camera, gl])

  if (!part) return null

  return (
    <>
      <group ref={groupRef} userData={{ preview: true }}>
        <PlacedPartMesh part={part} preview />
      </group>
      <group ref={faceRef} visible={false}>
        <mesh renderOrder={30} raycast={() => {}}>
          <circleGeometry args={[0.5, 24]} />
          <meshBasicMaterial
            color="#3EA6FF"
            transparent
            opacity={0.45}
            side={DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      {debugHoles ? (
        <>
          <lineSegments raycast={() => {}} renderOrder={31} frustumCulled={false}>
            <bufferGeometry ref={rayGeometryRef} />
            <lineBasicMaterial color="#ff4d4d" depthTest={false} toneMapped={false} />
          </lineSegments>
          <group ref={rayHitRef}>
            <mesh raycast={() => {}} renderOrder={32}>
              <sphereGeometry args={[0.12, 12, 8]} />
              <meshBasicMaterial color="#ff4d4d" depthTest={false} toneMapped={false} />
            </mesh>
          </group>
        </>
      ) : null}
    </>
  )
}
