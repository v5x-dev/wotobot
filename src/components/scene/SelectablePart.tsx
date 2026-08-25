import { TransformControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import {
  AlwaysStencilFunc,
  BackSide,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  KeepStencilOp,
  Line,
  Mesh,
  NotEqualStencilFunc,
  Plane,
  Raycaster,
  ReplaceStencilOp,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Camera,
  type Material,
  type Object3D,
} from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { computeBoundsTree } from 'three-mesh-bvh'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'
import { consumeGizmoPointer, setGizmoPointerTarget } from './gizmoPointer'
import { AXIS_COLORS } from '@/model/colors'
import { GRID_SNAP, ROTATION_SNAP, snap } from '@/model/grid'

const SELECTED_OUTLINE = '#3EA6FF'
const CONNECTED_OUTLINE = '#7ec8ff'
const OUTLINE_THICKNESS = 2.5
const DRAG_THRESHOLD = 4
const ROTATE_RING_RADIUS = 1.25

const _plane = new Plane()
const _hit = new Vector3()
const _up = new Vector3(0, 1, 0)
const _pointer = new Vector2()

type GizmoMode = 'translate' | 'rotate' | 'scale'

type CombinedGizmo = Object3D & {
  gizmo: Record<GizmoMode, Object3D>
  picker: Record<GizmoMode, Object3D>
  updateMatrixWorld: () => void
}

type CombinedControls = {
  enabled: boolean
  axis: string | null
  dragging: boolean
  gizmo: CombinedGizmo
}

const HIDDEN_ROTATE_HANDLES = new Set(['E', 'XYZE'])
const AXIS_COLOR_BY_NAME: Record<string, string> = {
  X: AXIS_COLORS[0],
  Y: AXIS_COLORS[1],
  Z: AXIS_COLORS[2],
}

function asControls(controls: TransformControlsImpl | null) {
  return controls as unknown as CombinedControls | null
}

function applyAxisColors(root: Object3D) {
  root.traverse((object) => {
    const color = AXIS_COLOR_BY_NAME[object.name]
    if (!color || !('material' in object)) return
    const source = (object as Object3D & { material: Material | Material[] }).material
    const materials = Array.isArray(source) ? source : [source]
    for (const material of materials) {
      if (!('color' in material) || !(material.color instanceof Color)) continue
      material.color.set(color)
      const baseColor = (material as Material & { _color?: Color })._color
      if (baseColor instanceof Color) baseColor.set(color)
    }
  })
}

function firstPickerHit(raycaster: Raycaster, root: Object3D, skip?: Set<string>) {
  for (const hit of raycaster.intersectObject(root, true)) {
    if (skip?.has(hit.object.name)) continue
    // Picker groups stay hidden so they don't render; their children still catch rays.
    return hit
  }
  return undefined
}

function hideRotateExtras(gizmo: CombinedGizmo) {
  for (const child of gizmo.gizmo.rotate.children) {
    if (HIDDEN_ROTATE_HANDLES.has(child.name)) {
      child.visible = false
      continue
    }
    if ((child.name === 'X' || child.name === 'Y' || child.name === 'Z') && (child as Mesh).isMesh) {
      child.visible = false
    }
  }
  for (const child of gizmo.picker.rotate.children) {
    if (HIDDEN_ROTATE_HANDLES.has(child.name)) child.visible = false
  }
}

function fullCircleGeometry(axis: 'X' | 'Y' | 'Z') {
  const geometry = new BufferGeometry()
  const vertices: number[] = []
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 32) * Math.PI
    vertices.push(0, Math.cos(angle) * ROTATE_RING_RADIUS, Math.sin(angle) * ROTATE_RING_RADIUS)
  }
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  if (axis === 'Y') geometry.rotateZ(-Math.PI / 2)
  if (axis === 'Z') geometry.rotateY(Math.PI / 2)
  return geometry
}

function closeRotateRings(gizmo: CombinedGizmo) {
  for (const child of gizmo.gizmo.rotate.children) {
    if (child.name !== 'X' && child.name !== 'Y' && child.name !== 'Z') continue
    const line = child as Line
    if (!line.isLine) continue
    line.geometry.dispose()
    line.geometry = fullCircleGeometry(child.name)
  }
  for (const child of gizmo.picker.rotate.children) {
    if (child.name !== 'X' && child.name !== 'Y' && child.name !== 'Z') continue
    const mesh = child as Mesh
    if (!mesh.isMesh || mesh.userData.rotatePickerScaled) continue
    mesh.userData.rotatePickerScaled = true
    const scaled = mesh.geometry.clone()
    scaled.scale(ROTATE_RING_RADIUS, ROTATE_RING_RADIUS, ROTATE_RING_RADIUS)
    mesh.geometry.dispose()
    mesh.geometry = scaled
  }
}

function hideFreeRotate(controls: TransformControlsImpl) {
  const gizmo = asControls(controls)!.gizmo
  closeRotateRings(gizmo)
  const originalUpdate = gizmo.updateMatrixWorld
  gizmo.updateMatrixWorld = () => {
    originalUpdate.call(gizmo)
    hideRotateExtras(gizmo)
  }
  return () => {
    gizmo.updateMatrixWorld = originalUpdate
  }
}

function pickerHit(
  controls: CombinedControls,
  mode: 'translate' | 'rotate',
  event: PointerEvent,
  dom: HTMLElement,
  camera: Camera,
  raycaster: Raycaster,
) {
  const rect = dom.getBoundingClientRect()
  _pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
  raycaster.setFromCamera(_pointer, camera)
  return firstPickerHit(
    raycaster,
    controls.gizmo.picker[mode],
    mode === 'rotate' ? HIDDEN_ROTATE_HANDLES : undefined,
  )
}

const vertexShader = /* glsl */ `
  uniform float uThickness;
  uniform vec2 uResolution;

  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 viewNormal = normalize(normalMatrix * normal);
    vec4 clipNormal = projectionMatrix * vec4(viewNormal, 0.0);
    vec2 screenNormal = clipNormal.xy;
    float screenNormalLength = length(screenNormal);
    if (screenNormalLength > 1e-6) {
      clip.xy += (screenNormal / screenNormalLength) * uThickness / uResolution * clip.w * 2.0;
    }
    gl_Position = clip;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;

  void main() {
    gl_FragColor = vec4(uColor, 1.0);
    #include <colorspace_fragment>
  }
`

function isPartMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh && !object.userData.isOutline && !object.userData.skipOutline
}

function weldedOutlineGeometry(source: BufferGeometry) {
  const positions = new BufferGeometry()
  positions.setAttribute('position', source.getAttribute('position').clone())
  if (source.index) positions.setIndex(source.index.clone())
  const welded = mergeVertices(positions)
  positions.dispose()
  welded.computeVertexNormals()
  return welded
}

function cloneWithStencil(material: Material) {
  const clone = material.clone()
  clone.stencilWrite = true
  clone.stencilRef = 1
  clone.stencilFunc = AlwaysStencilFunc
  clone.stencilFail = KeepStencilOp
  clone.stencilZFail = KeepStencilOp
  clone.stencilZPass = ReplaceStencilOp
  return clone
}

function cloneWithConnectedTint(material: Material) {
  const clone = material.clone()
  if ('color' in clone && clone.color instanceof Color) {
    clone.color.lerp(new Color(CONNECTED_OUTLINE), 0.28)
  }
  return clone
}

function withEachMaterial(mesh: Mesh, apply: (material: Material) => Material) {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(apply)
    return
  }
  mesh.material = apply(mesh.material)
}

function capturePointer(event: { pointerId: number }) {
  const r3fEvent = event as typeof event & { setPointerCapture?: (id: number) => void }
  r3fEvent.setPointerCapture?.(event.pointerId)
}

function setOrbitEnabled(controls: unknown, enabled: boolean) {
  if (controls && typeof controls === 'object' && 'enabled' in controls) {
    ;(controls as { enabled: boolean }).enabled = enabled
  }
}

function gizmoTag(object: Object3D) {
  return 'tag' in object ? (object as Object3D & { tag?: string }).tag : undefined
}

/** Keep flipped axis cones pointing along the shaft instead of toward the origin. */
function alignFlippedArrowHeads(root: Object3D) {
  if (root.userData.arrowHeadsAligned) return
  root.userData.arrowHeadsAligned = true

  const fwdGeometry = new Map<string, Mesh['geometry']>()
  root.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh || gizmoTag(mesh) !== 'fwd') return
    if (mesh.name === 'X' || mesh.name === 'Y' || mesh.name === 'Z') {
      fwdGeometry.set(mesh.name, mesh.geometry)
    }
  })
  root.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh || gizmoTag(mesh) !== 'bwd') return
    const geometry = fwdGeometry.get(mesh.name)
    if (!geometry || mesh.geometry === geometry) return
    mesh.geometry.dispose()
    mesh.geometry = geometry
  })
}

function CombinedTransformGizmo({
  object,
  onMouseDown,
  onMouseUp,
  onChange,
}: {
  object: RefObject<Object3D>
  onMouseDown: () => void
  onMouseUp: () => void
  onChange: () => void
}) {
  const translateRef = useRef<TransformControlsImpl>(null)
  const rotateRef = useRef<TransformControlsImpl>(null)
  const dragging = useRef(false)
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const events = useThree((state) => state.events)
  const raycaster = useMemo(() => new Raycaster(), [])

  useLayoutEffect(() => {
    const translate = translateRef.current
    const rotate = rotateRef.current
    if (!translate || !rotate) return

    applyAxisColors(asControls(translate)!.gizmo.gizmo.translate)
    applyAxisColors(asControls(rotate)!.gizmo.gizmo.rotate)
    alignFlippedArrowHeads(translate)
    const restoreRotate = hideFreeRotate(rotate)
    const dom = (events.connected as HTMLElement | undefined) ?? gl.domElement

    function winner(event: PointerEvent) {
      const translateControls = asControls(translateRef.current)
      const rotateControls = asControls(rotateRef.current)
      if (!translateControls || !rotateControls) return null
      const translateHit = pickerHit(translateControls, 'translate', event, dom, camera, raycaster)
      const rotateHit = pickerHit(rotateControls, 'rotate', event, dom, camera, raycaster)
      if (translateHit && rotateHit) {
        return translateHit.distance < rotateHit.distance ? ('translate' as const) : ('rotate' as const)
      }
      if (translateHit) return 'translate' as const
      if (rotateHit) return 'rotate' as const
      return null
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return
      const translateControls = asControls(translateRef.current)
      const rotateControls = asControls(rotateRef.current)
      if (!translateControls || !rotateControls) return
      const pick = winner(event)
      setGizmoPointerTarget(pick !== null)
      if (pick === 'translate') {
        rotateControls.enabled = false
        rotateControls.axis = null
      } else if (pick === 'rotate') {
        translateControls.enabled = false
        translateControls.axis = null
      }
    }

    function onPointerUp() {
      setGizmoPointerTarget(false)
      const translateControls = asControls(translateRef.current)
      const rotateControls = asControls(rotateRef.current)
      if (translateControls) translateControls.enabled = true
      if (rotateControls) rotateControls.enabled = true
      dragging.current = false
    }

    function onPointerMove(event: PointerEvent) {
      const translateControls = asControls(translateRef.current)
      const rotateControls = asControls(rotateRef.current)
      if (!translateControls || !rotateControls) return
      if (dragging.current || translateControls.dragging || rotateControls.dragging) return
      const pick = winner(event)
      if (pick === 'translate') rotateControls.axis = null
      else if (pick === 'rotate') translateControls.axis = null
    }

    dom.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointermove', onPointerMove)
    return () => {
      setGizmoPointerTarget(false)
      restoreRotate()
      dom.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointermove', onPointerMove)
    }
  }, [camera, events, gl, raycaster])

  return (
    <>
      <TransformControls
        ref={translateRef}
        object={object}
        mode="translate"
        space="world"
        translationSnap={GRID_SNAP}
        size={0.85}
        onMouseDown={() => {
          dragging.current = true
          onMouseDown()
        }}
        onMouseUp={onMouseUp}
        onObjectChange={onChange}
      />
      <TransformControls
        ref={rotateRef}
        object={object}
        mode="rotate"
        space="world"
        rotationSnap={ROTATION_SNAP}
        size={0.85}
        onMouseDown={() => {
          dragging.current = true
          onMouseDown()
        }}
        onMouseUp={onMouseUp}
        onObjectChange={onChange}
      />
    </>
  )
}

type OutlineKind = 'selected' | 'connected' | null

type Props = {
  outline?: OutlineKind
  showGizmo?: boolean
  interactive?: boolean
  partKind?: string
  position: [number, number, number]
  rotation: [number, number, number]
  onSelect: (additive: boolean) => void
  onTransform: (position: [number, number, number], rotation: [number, number, number]) => void
  onTransformLive: (position: [number, number, number], rotation: [number, number, number]) => void
  onMoveStart?: () => void
  onMoveEnd?: () => void
  children: ReactNode
}

function readTransform(group: Group): {
  position: [number, number, number]
  rotation: [number, number, number]
} {
  return {
    position: [group.position.x, group.position.y, group.position.z],
    rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
  }
}

export function SelectablePart({
  outline = null,
  showGizmo = false,
  interactive = true,
  partKind,
  position,
  rotation,
  onSelect,
  onTransform,
  onTransformLive,
  onMoveStart,
  onMoveEnd,
  children,
}: Props) {
  const selected = outline != null
  const groupRef = useRef<Group>(null)
  const outlineMaterialRef = useRef<ShaderMaterial | null>(null)
  const movingRef = useRef(false)
  const dragSourceRef = useRef<'part' | 'gizmo' | null>(null)
  const dragStartedRef = useRef(false)
  const grabOffset = useRef(new Vector3())
  const pointerDown = useRef({ x: 0, y: 0 })
  const orbitControls = useThree((state) => state.controls)

  useLayoutEffect(() => {
    if (movingRef.current) return
    const group = groupRef.current
    if (!group) return
    group.position.set(position[0], position[1], position[2])
    group.rotation.set(rotation[0], rotation[1], rotation[2])
  }, [position, rotation])

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.traverse((object) => {
      if (!isPartMesh(object)) return
      const geometry = object.geometry as BufferGeometry & { boundsTree?: unknown }
      if (!geometry.boundsTree) computeBoundsTree.call(geometry)
    })
  }, [children])

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!selected || !group) return

    if (outline === 'connected') {
      const restored: Array<{ mesh: Mesh; material: Material | Material[] }> = []
      const tintClones = new Map<Material, Material>()
      group.traverse((object) => {
        if (!isPartMesh(object)) return
        restored.push({ mesh: object, material: object.material })
        withEachMaterial(object, (material) => {
          const existing = tintClones.get(material)
          if (existing) return existing
          const clone = cloneWithConnectedTint(material)
          tintClones.set(material, clone)
          return clone
        })
      })
      return () => {
        for (const { mesh, material } of restored) mesh.material = material
        for (const clone of tintClones.values()) clone.dispose()
      }
    }

    const outlineMaterial = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(SELECTED_OUTLINE) },
        uThickness: { value: OUTLINE_THICKNESS },
        uResolution: { value: new Vector2(1, 1) },
      },
      vertexShader,
      fragmentShader,
      side: BackSide,
      depthWrite: false,
      toneMapped: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: NotEqualStencilFunc,
      stencilFail: KeepStencilOp,
      stencilZFail: KeepStencilOp,
      stencilZPass: KeepStencilOp,
    })
    outlineMaterialRef.current = outlineMaterial

    const restored: Array<{ mesh: Mesh; material: Material | Material[] }> = []
    const outlineMeshes: Array<{ source: Mesh; outline: Mesh; ownedGeometry?: BufferGeometry }> = []
    const stencilClones = new Map<Material, Material>()

    group.traverse((object) => {
      if (!isPartMesh(object)) return

      restored.push({ mesh: object, material: object.material })
      withEachMaterial(object, (material) => {
        const existing = stencilClones.get(material)
        if (existing) return existing
        const clone = cloneWithStencil(material)
        stencilClones.set(material, clone)
        return clone
      })

      if (!object.geometry.attributes.normal) object.geometry.computeVertexNormals()

      const ownedGeometry = object.userData.weldOutline
        ? weldedOutlineGeometry(object.geometry)
        : undefined
      const outline = new Mesh(ownedGeometry ?? object.geometry, outlineMaterial)
      outline.userData.isOutline = true
      outline.renderOrder = 1000
      outline.frustumCulled = false
      outline.raycast = () => {}
      object.add(outline)
      outlineMeshes.push({ source: object, outline, ownedGeometry })
    })

    return () => {
      outlineMaterialRef.current = null
      outlineMaterial.dispose()
      for (const { source, outline, ownedGeometry } of outlineMeshes) {
        source.remove(outline)
        ownedGeometry?.dispose()
      }
      for (const { mesh, material } of restored) {
        mesh.material = material
      }
      for (const clone of stencilClones.values()) clone.dispose()
    }
  }, [outline, selected])

  useFrame(({ gl }) => {
    const material = outlineMaterialRef.current
    if (material) gl.getDrawingBufferSize(material.uniforms.uResolution.value)
  })

  function commitTransform() {
    const group = groupRef.current
    if (!group) return
    const next = readTransform(group)
    onTransform(next.position, next.rotation)
  }

  function finishPartDrag() {
    if (dragSourceRef.current !== 'part') return
    if (dragStartedRef.current) commitTransform()
    dragSourceRef.current = null
    movingRef.current = false
    dragStartedRef.current = false
    setOrbitEnabled(orbitControls, true)
    onMoveEnd?.()
  }

  return (
    <>
      <group
        ref={groupRef}
        userData={{ partKind }}
        onPointerDown={(event) => {
          if (!interactive || event.button !== 0) return
          event.stopPropagation()
          if (consumeGizmoPointer(event)) return
          onSelect(event.shiftKey)

          const group = groupRef.current
          if (!group) return

          dragSourceRef.current = 'part'
          movingRef.current = true
          dragStartedRef.current = false
          pointerDown.current = { x: event.clientX, y: event.clientY }
          _plane.set(_up, -group.position.y)
          if (event.ray.intersectPlane(_plane, _hit)) {
            grabOffset.current.copy(_hit).sub(group.position)
          }

          capturePointer(event)
          setOrbitEnabled(orbitControls, false)
          onMoveStart?.()
        }}
        onPointerMove={(event) => {
          if (!interactive || dragSourceRef.current !== 'part') return
          event.stopPropagation()

          const group = groupRef.current
          if (!group) return

          if (!dragStartedRef.current) {
            const dx = event.clientX - pointerDown.current.x
            const dy = event.clientY - pointerDown.current.y
            if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return
            dragStartedRef.current = true
          }

          _plane.set(_up, -group.position.y)
          if (!event.ray.intersectPlane(_plane, _hit)) return
          group.position.set(
            snap(_hit.x - grabOffset.current.x),
            group.position.y,
            snap(_hit.z - grabOffset.current.z),
          )
        }}
        onPointerUp={finishPartDrag}
        onPointerCancel={finishPartDrag}
      >
        {children}
      </group>
      {showGizmo && interactive && (
        <CombinedTransformGizmo
          object={groupRef as RefObject<Object3D>}
          onMouseDown={() => {
            dragSourceRef.current = 'gizmo'
            movingRef.current = true
            setOrbitEnabled(orbitControls, false)
            onMoveStart?.()
          }}
          onMouseUp={() => {
            if (dragSourceRef.current !== 'gizmo') return
            commitTransform()
            dragSourceRef.current = null
            movingRef.current = false
            setOrbitEnabled(orbitControls, true)
            onMoveEnd?.()
          }}
          onChange={() => {
            if (dragSourceRef.current !== 'gizmo') return
            const group = groupRef.current
            if (!group) return
            const next = readTransform(group)
            onTransformLive(next.position, next.rotation)
          }}
        />
      )}
    </>
  )
}
