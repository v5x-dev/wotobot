import { Edges, useFBX } from '@react-three/drei'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import {
  DoubleSide,
  ExtrudeGeometry,
  FrontSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Path,
  Quaternion,
  Shape,
  Vector3,
  type Material,
  type Object3D,
} from 'three'
import { mergeGroups } from 'three/addons/utils/BufferGeometryUtils.js'
import { SelectablePart } from './SelectablePart'
import { holesForPart, SCREW_HOLE_DIAMETER } from '@/model/holes'
import {
  collectChannelPieces,
  getAssembledChannelGeometry,
  getAssembledLinearSplitGeometry,
} from '@/model/channelGeometry'
import { chainGeometry, resampleClosedPath, type SprocketChain } from '@/model/chains'
import { eulerToQuat } from '@/model/math'
import { modelScaleFor } from '@/model/modelScale'
import { loadingBoxForPart } from '@/model/loadingBounds'
import { DEFAULT_COLOR } from '@/model/colors'
import {
  channelProfileFromSize,
  findPart,
  modelUrl,
  pointInPolygon,
  polycarbonateOutline,
  variantFor,
  type PlacedPart,
} from '@/model/parts'

const SPLIT_FBX = modelUrl('Structure/C-Channels (split).fbx')
const ANGLE_SPLIT_FBX = modelUrl('Structure/Angles (split).fbx')
const U_CHANNEL_SPLIT_FBX = modelUrl('Structure/U-Channels (split).fbx')
const MODEL_ROTATION: [number, number, number] = [0, 0, 0]
const DEFAULT_PART_COLOR = DEFAULT_COLOR

const aluminum = new MeshStandardMaterial({
  color: '#F2F2F2',
  metalness: 0.754,
  roughness: 0.925,
  side: DoubleSide,
})

const preview = new MeshStandardMaterial({
  color: '#F2F2F2',
  metalness: 0.754,
  roughness: 0.925,
  transparent: true,
  opacity: 0.25,
  side: DoubleSide,
  depthWrite: false,
})

const missing = new MeshStandardMaterial({
  color: '#c45c26',
  metalness: 0.1,
  roughness: 0.8,
})

const polycarbonate = new MeshStandardMaterial({
  color: '#b9e4ef',
  metalness: 0,
  roughness: 0.18,
  transparent: true,
  opacity: 0.48,
  side: DoubleSide,
  depthWrite: false,
})

function noopRaycast() {}

function compactName(name: string) {
  return name.toLowerCase().replace(/[\s_-]/g, '')
}

function findNamedObject(root: Object3D, name: string) {
  if (!name) return null
  let exactMesh: Mesh | null = null
  let exact: Object3D | null = null
  let looseMesh: Mesh | null = null
  let loose: Object3D | null = null
  const lower = name.toLowerCase()
  const compact = compactName(name)
  root.traverse((obj) => {
    const mesh = obj as Mesh
    const n = obj.name.toLowerCase()
    const nCompact = compactName(obj.name)
    if (obj.name === name || nCompact === compact) {
      exact ??= obj
      if (mesh.isMesh) exactMesh ??= mesh
    } else if (obj.name && (n.includes(lower) || nCompact.includes(compact))) {
      loose ??= obj
      if (mesh.isMesh) looseMesh ??= mesh
    }
  })
  return exactMesh ?? looseMesh ?? exact ?? loose
}

function firstMesh(root: Object3D) {
  let mesh: Mesh | null = null
  root.traverse((obj) => {
    const candidate = obj as Mesh
    if (!mesh && candidate.isMesh) mesh = candidate
  })
  return mesh
}

function toPartMaterial(material: Material) {
  if (material instanceof MeshStandardMaterial) return material.clone()
  const colored = material as Material & { color?: { clone: () => MeshStandardMaterial['color'] } }
  return new MeshStandardMaterial({
    color: colored.color?.clone() ?? '#888888',
    metalness: 0.15,
    roughness: 0.55,
  })
}

function compactMeshGroups(mesh: Mesh) {
  const { geometry } = mesh
  if (geometry.userData.groupsMerged || geometry.groups.length < 2) return
  mergeGroups(geometry)
  geometry.userData.groupsMerged = true
}

type MeshFinish = 'aluminum' | 'model' | 'aluminum-preview' | 'model-preview'

function surfaceMaterial(finish: MeshFinish) {
  if (finish === 'aluminum-preview') return preview
  return aluminum
}

function makePreviewMaterial(material: Material) {
  const previewMaterial = toPartMaterial(material)
  previewMaterial.transparent = true
  previewMaterial.opacity = 0.25
  previewMaterial.depthWrite = false
  return previewMaterial
}

function prepareFbxClone(
  source: Object3D,
  finish: MeshFinish,
  rotation?: [number, number, number],
  color?: [number, number, number] | null,
  metalness?: number,
) {
  const clone = source.clone(true)
  clone.position.set(0, 0, 0)
  clone.scale.setScalar(1)
  if (rotation) clone.rotation.set(...rotation)
  clone.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return

    compactMeshGroups(mesh)
    mesh.material =
      finish === 'model' || finish === 'model-preview'
        ? Array.isArray(mesh.material)
          ? mesh.material.map(finish === 'model-preview' ? makePreviewMaterial : toPartMaterial)
          : (finish === 'model-preview' ? makePreviewMaterial : toPartMaterial)(mesh.material)
        : surfaceMaterial(finish)
    if (finish.endsWith('-preview')) mesh.raycast = noopRaycast
    const partColor = color ?? DEFAULT_PART_COLOR
    const apply = (material: Material) => {
      if (!(material instanceof MeshStandardMaterial)) return
      material.color.setRGB(...partColor)
      if (metalness != null) material.metalness = metalness
    }
    if (Array.isArray(mesh.material)) mesh.material.forEach(apply)
    else apply(mesh.material)
  })
  return clone
}

function AssembledChannel({
  pieces,
  profile,
  holes,
  material,
}: {
  pieces: ReturnType<typeof collectChannelPieces>
  profile: ReturnType<typeof channelProfileFromSize>
  holes: number
  material: MeshStandardMaterial
}) {
  const profilePieces = pieces[profile]
  const geometry = useMemo(
    () => getAssembledChannelGeometry(profilePieces, holes),
    [holes, profilePieces],
  )

  return (
    <mesh
      geometry={geometry}
      material={material}
      {...(material === preview ? { raycast: noopRaycast } : {})}
    />
  )
}

function ChannelPart({
  size,
  holes,
  material,
}: {
  size: string
  holes: number
  material: MeshStandardMaterial
}) {
  const splitFbx = useFBX(SPLIT_FBX)
  const pieces = useMemo(() => collectChannelPieces(splitFbx), [splitFbx])
  const profile = channelProfileFromSize(size)

  return (
    <AssembledChannel
      pieces={pieces}
      profile={profile}
      holes={holes}
      material={material}
    />
  )
}

function AnglePart({
  size,
  holes,
  material,
}: {
  size: string
  holes: number
  material: MeshStandardMaterial
}) {
  const splitFbx = useFBX(ANGLE_SPLIT_FBX)
  const geometry = useMemo(
    () => getAssembledLinearSplitGeometry(splitFbx, {
      start: `ANGL_${size}-Start`,
      end: `ANGL_${size}-End`,
      mid: `ANGL_${size}-Mid`,
      mid5Start: `ANGL_${size}-Mid5Start`,
      mid5End: `ANGL_${size}-Mid5End`,
    }, holes),
    [holes, size, splitFbx],
  )

  return <mesh geometry={geometry} material={material} />
}

function UChannelPart({ holes, material }: { holes: number; material: MeshStandardMaterial }) {
  const splitFbx = useFBX(U_CHANNEL_SPLIT_FBX)
  const geometry = useMemo(
    () => getAssembledLinearSplitGeometry(splitFbx, {
      start: 'UChannel-Start',
      end: 'UChannel-End',
      mid: 'UChannel-Mid',
      mid5Start: 'UChannel-Mid5Start',
      mid5End: 'UChannel-Mid5End',
    }, holes),
    [holes, splitFbx],
  )

  return <mesh geometry={geometry} material={material} />
}

function FbxMeshPart({
  url,
  meshName,
  scale,
  rotation,
  finish = 'model',
  color = null,
  metalness,
}: {
  url: string
  meshName: string
  scale?: [number, number, number]
  rotation?: [number, number, number]
  finish?: MeshFinish
  color?: [number, number, number] | null
  metalness?: number
}) {
  const fbx = useFBX(url)
  const object = useMemo(() => {
    const source = findNamedObject(fbx, meshName) ?? firstMesh(fbx) ?? fbx
    return prepareFbxClone(source, finish, rotation, color, metalness)
  }, [fbx, meshName, finish, rotation, color, metalness])

  return <primitive object={object} scale={scale ?? [1, 1, 1]} />
}

function PlatePart({
  length,
  width,
  url,
  meshName,
  material,
}: {
  length: number
  width: number
  url: string
  meshName: string
  material: MeshStandardMaterial
}) {
  const fbx = useFBX(url)
  const geometry = useMemo(() => {
    const mesh = (findNamedObject(fbx, meshName) as Mesh | null) ?? firstMesh(fbx)
    return mesh?.geometry ?? null
  }, [fbx, meshName])

  const getPos = (val: number, max: number) => 0.5 * ((-max + 1) / 2 + val)

  if (!geometry) {
    return <MissingPart />
  }

  return (
    <group>
      {Array.from({ length }, (_, x) =>
        Array.from({ length: width }, (_, y) => (
          <mesh
            key={`${x}-${y}`}
            geometry={geometry}
            material={material}
            position={[getPos(x, length), getPos(y, width), 0]}
            {...(material === preview ? { raycast: noopRaycast } : {})}
          />
        )),
      )}
    </group>
  )
}

function MissingPart() {
  return (
    <mesh material={missing}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
    </mesh>
  )
}

export function ModelLoadingPlaceholder({ part }: { part?: PlacedPart }) {
  const box = loadingBoxForPart(part)
  return (
    <mesh raycast={noopRaycast} position={box.position}>
      <boxGeometry args={box.size} />
      <meshBasicMaterial color="#3EA6FF" transparent opacity={0.08} depthWrite={false} />
      <Edges color="#3EA6FF" lineWidth={1.5} />
    </mesh>
  )
}

function SprocketPart({
  part,
  isPreview,
  toothPhase,
}: {
  part: PlacedPart
  isPreview: boolean
  toothPhase: number
}) {
  const definition = findPart(part.key)
  const variant = definition && variantFor(definition, part.param1, part.param2)
  const url = variant?.fbx ? modelUrl(variant.fbx) : SPLIT_FBX
  const fbx = useFBX(url)
  const object = useMemo(() => {
    if (!variant) return null
    const source = findNamedObject(fbx, variant.meshName)
    const meshSource = source && (source as Mesh).isMesh ? (source as Mesh) : firstMesh(source ?? fbx)
    if (!meshSource) return null
    const clone = prepareFbxClone(
      meshSource,
      isPreview ? 'model-preview' : 'model',
      undefined,
      part.color,
    )
    clone.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const apply = (material: Material) => {
        if (!(material instanceof MeshStandardMaterial)) return
        material.side = FrontSide
        material.metalness = 0.15
        material.roughness = 0.55
      }
      if (Array.isArray(mesh.material)) mesh.material.forEach(apply)
      else apply(mesh.material)
    })
    return clone
  }, [fbx, isPreview, part.color, variant])

  if (!variant?.fbx || !object) return <MissingPart />

  return <primitive object={object} rotation={[0, 0, toothPhase]} />
}

function PolycarbonatePart({ part, isPreview }: { part: PlacedPart; isPreview: boolean }) {
  const spec = part.shape
  const param1 = part.param1
  const param2 = part.param2
  const geometry = useMemo(() => {
    const points = polycarbonateOutline({ param1, param2, shape: spec })
    const outline = new Shape()
    outline.moveTo(points[0][0], points[0][1])
    points.slice(1).forEach(([x, y]) => outline.lineTo(x, y))
    outline.closePath()
    const radius = SCREW_HOLE_DIAMETER / 2
    let area = 0
    for (let i = 0; i < points.length; i += 1) {
      const [x, y] = points[i]
      const [nx, ny] = points[(i + 1) % points.length]
      area += x * ny - nx * y
    }
    const holeClockwise = area > 0
    for (const [x, y] of spec?.holes ?? []) {
      if (!pointInPolygon([x, y], points)) continue
      const hole = new Path()
      hole.absarc(x, y, radius, 0, Math.PI * 2, holeClockwise)
      outline.holes.push(hole)
    }
    const result = new ExtrudeGeometry(outline, {
      depth: spec?.thickness ?? 0.0625,
      bevelEnabled: false,
      curveSegments: 48,
    })
    result.center()
    return result
  }, [param1, param2, spec])
  const material = useMemo(
    () => {
      const result = (isPreview ? makePreviewMaterial(polycarbonate) : polycarbonate.clone())
      result.color.setRGB(...(part.color ?? DEFAULT_PART_COLOR))
      return result
    },
    [isPreview, part.color],
  )
  return <mesh geometry={geometry} material={material} {...(isPreview ? { raycast: noopRaycast } : {})} />
}

function HoleColliders({
  part,
  show,
}: {
  part: PlacedPart
  show: boolean
}) {
  const holes = useMemo(
    () => holesForPart(part),
    [part],
  )

  return (
    <group>
      {holes.map((hole, index) => (
        <group key={index} position={hole.position} quaternion={hole.rotation}>
          <mesh
            userData={{ holeKind: 'hole', hole, partId: part.instanceId, skipOutline: true }}
            renderOrder={20}
          >
            <planeGeometry args={[hole.size[0], hole.size[1]]} />
            <meshBasicMaterial
              color="#3EA6FF"
              side={DoubleSide}
              transparent
              opacity={show ? 0.45 : 0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function aluminumMaterial(color: [number, number, number] | null, isPreview: boolean) {
  if (!color) return isPreview ? preview : aluminum
  const material = (isPreview ? preview : aluminum).clone()
  material.color.setRGB(color[0], color[1], color[2])
  return material
}

export function PlacedPartMesh({
  part,
  preview: isPreview = false,
  showHoles = false,
  detectHoles = false,
  sprocketPhase = 0,
}: {
  part: PlacedPart
  preview?: boolean
  showHoles?: boolean
  detectHoles?: boolean
  sprocketPhase?: number
}) {
  const definition = findPart(part.key)
  const material = aluminumMaterial(part.color, isPreview)
  const finish: MeshFinish = isPreview ? 'aluminum-preview' : 'aluminum'
  const holes = !isPreview && (showHoles || detectHoles)
    ? <HoleColliders part={part} show={showHoles} />
    : null

  if (!definition) {
    return (
      <>
        <MissingPart />
        {holes}
      </>
    )
  }

  if (definition.generator === 'polycarbonate') {
    return (
      <>
        <PolycarbonatePart part={part} isPreview={isPreview} />
        {holes}
      </>
    )
  }

  if (definition.id === 'SPKT') {
    return (
      <>
        <SprocketPart part={part} isPreview={isPreview} toothPhase={sprocketPhase} />
        {holes}
      </>
    )
  }

  if (definition.id === 'CCHL' && definition.generator === 'aluminum') {
    const holeCount = Number(part.param2) || 15
    return (
      <>
        <ChannelPart size={part.param1} holes={holeCount} material={material} />
        {holes}
      </>
    )
  }

  if (definition.id === 'ANGL' && definition.generator === 'aluminum') {
    const holeCount = Number(part.param2) || 5
    return (
      <>
        <AnglePart size={part.param1} holes={holeCount} material={material} />
        {holes}
      </>
    )
  }

  if (definition.id === 'UCHL' && definition.generator === 'aluminum') {
    const holeCount = Number(part.param2) || 20
    return (
      <>
        <UChannelPart holes={holeCount} material={material} />
        {holes}
      </>
    )
  }

  if (definition.generator === 'plate' && definition.mesh?.fbx) {
    return (
      <>
        <PlatePart
          length={Number(part.param1) || 5}
          width={Number(part.param2) || 5}
          url={modelUrl(definition.mesh.fbx)}
          meshName={definition.mesh.meshName}
          material={material}
        />
        {holes}
      </>
    )
  }

  if (definition.generator === 'shaft') {
    const variant = variantFor(definition, part.param1, part.param2)
    if (!variant?.fbx) return <MissingPart />
    const inches = Number(part.param2) || 6
    return (
      <>
        <FbxMeshPart
          url={modelUrl(variant.fbx)}
          meshName={variant.meshName}
          scale={[1, 1, inches]}
          rotation={MODEL_ROTATION}
          finish={finish}
          color={part.color}
        />
        {holes}
      </>
    )
  }

  if (definition.generator === 'aluminum' && definition.mesh?.fbx) {
    const holeCount = part.param2 || '5'
    const meshName = `${definition.mesh.meshName}_${part.param1}x${holeCount}`
    return (
      <>
        <FbxMeshPart
          url={modelUrl(definition.mesh.fbx)}
          meshName={meshName}
          rotation={MODEL_ROTATION}
          finish={finish}
          color={part.color}
        />
        {holes}
      </>
    )
  }

  const variant = variantFor(definition, part.param1, part.param2)
  const fbx = variant?.fbx ?? definition.mesh?.fbx
  const meshName = variant?.meshName || definition.mesh?.meshName || definition.name
  const scale = fbx ? modelScaleFor(fbx) : 1
  const modelScale = scale === 1 ? undefined : [scale, scale, scale] satisfies [number, number, number]
  if (!fbx) {
    return (
      <>
        <MissingPart />
        {holes}
      </>
    )
  }

  return (
    <>
      <FbxMeshPart
        url={modelUrl(fbx)}
        meshName={meshName}
        scale={modelScale}
        rotation={fbx === 'pnmatics/NewRes.fbx' ? [Math.PI, 0, 0] : MODEL_ROTATION}
        finish={isPreview ? 'model-preview' : 'model'}
        color={part.color}
        metalness={definition.id === 'TANK' ? aluminum.metalness : undefined}
      />
      {holes}
    </>
  )
}

function chainSprocketPhases(parts: PlacedPart[], chains: SprocketChain[]) {
  const partById = new Map(parts.map((part) => [part.instanceId, part]))
  const phases = new Map<number, number>()
  const localZ = new Vector3(0, 0, 1)

  for (const chain of chains) {
    const a = partById.get(chain.sprocketAId)
    const b = partById.get(chain.sprocketBId)
    if (!a || !b) continue
    const geometry = chainGeometry(a, b)
    if (!geometry) continue
    const linkPoints = resampleClosedPath(geometry.points, geometry.pitch)

    for (const sprocket of [a, b]) {
      if (phases.has(sprocket.instanceId)) continue
      const center = new Vector3(...sprocket.position)
      let closest: [number, number, number] | null = null
      let closestDistance = Infinity
      for (const point of linkPoints) {
        const distance = center.distanceToSquared(new Vector3(...point))
        if (distance >= closestDistance) continue
        closestDistance = distance
        closest = point
      }
      if (!closest) continue
      const local = new Vector3(...closest).sub(center)
      const rotation = eulerToQuat(sprocket.rotation, new Quaternion())
      const axis = localZ.clone().applyQuaternion(rotation).normalize()
      const inverseAxisAlignment = new Quaternion()
        .setFromUnitVectors(localZ, axis)
        .invert()
      local.applyQuaternion(inverseAxisAlignment)
      phases.set(
        sprocket.instanceId,
        Math.atan2(local.y, local.x) - sprocketValleyOffset(sprocket),
      )
    }
  }

  return phases
}

/** Tooth-gap phases measured from the catalog sprocket meshes. */
function sprocketValleyOffset(part: PlacedPart) {
  const teeth = Math.max(3, Number(part.param2.match(/\d+/)?.[0]) || 10)
  if (part.param1 === 'High Strength') {
    if (teeth === 12) return Math.PI / 12
    if (teeth === 24) return Math.PI / 24
    return 0
  }
  if (teeth === 10) return Math.PI / 10
  if (teeth === 15) return Math.PI / 30
  return 0
}

type InstancedCatalogGroup = {
  signature: string
  parts: PlacedPart[]
  url: string
  meshName: string
  scale: number
  modelRotation: [number, number, number]
  metalness?: number
}

function instancedCatalogDetails(part: PlacedPart): Omit<InstancedCatalogGroup, 'signature' | 'parts'> | null {
  const definition = findPart(part.key)
  if (!definition || definition.id === 'SPKT') return null
  if (definition.generator !== 'single' && definition.generator !== 'child') return null

  const variant = variantFor(definition, part.param1, part.param2)
  const fbx = variant?.fbx ?? definition.mesh?.fbx
  if (!fbx) return null

  return {
    url: modelUrl(fbx),
    meshName: variant?.meshName || definition.mesh?.meshName || definition.name,
    scale: modelScaleFor(fbx),
    modelRotation: fbx === 'pnmatics/NewRes.fbx' ? [Math.PI, 0, 0] : MODEL_ROTATION,
    metalness: definition.id === 'TANK' ? aluminum.metalness : undefined,
  }
}

function catalogRenderSignature(part: PlacedPart) {
  return JSON.stringify([
    part.key,
    part.param1,
    part.param2,
    part.color ?? DEFAULT_PART_COLOR,
    'model',
  ])
}

function InstancedCatalogParts({
  group,
  interactive,
  onSelect,
}: {
  group: InstancedCatalogGroup
  interactive: boolean
  onSelect: (id: number, additive: boolean) => void
}) {
  const fbx = useFBX(group.url)
  const meshes = useMemo(() => {
    const source = findNamedObject(fbx, group.meshName) ?? firstMesh(fbx) ?? fbx
    const object = prepareFbxClone(
      source,
      'model',
      group.modelRotation,
      group.parts[0]?.color,
      group.metalness,
    )
    object.scale.setScalar(group.scale)
    object.updateMatrixWorld(true)
    const result: Array<{ geometry: Mesh['geometry']; material: Mesh['material']; localMatrix: Matrix4 }> = []
    object.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      result.push({
        geometry: mesh.geometry,
        material: mesh.material,
        localMatrix: mesh.matrixWorld.clone(),
      })
    })
    return result
  }, [fbx, group.meshName, group.metalness, group.modelRotation, group.parts, group.scale])
  const refs = useRef<Array<InstancedMesh | null>>([])

  useLayoutEffect(() => {
    const partMatrix = new Matrix4()
    const rotation = new Quaternion()
    const position = new Vector3()
    const scale = new Vector3(1, 1, 1)
    for (let meshIndex = 0; meshIndex < meshes.length; meshIndex += 1) {
      const instance = refs.current[meshIndex]
      if (!instance) continue
      for (let partIndex = 0; partIndex < group.parts.length; partIndex += 1) {
        const part = group.parts[partIndex]
        position.set(...part.position)
        eulerToQuat(part.rotation, rotation)
        partMatrix.compose(position, rotation, scale).multiply(meshes[meshIndex].localMatrix)
        instance.setMatrixAt(partIndex, partMatrix)
      }
      instance.instanceMatrix.needsUpdate = true
      instance.computeBoundingSphere()
    }
  }, [group.parts, meshes])

  return (
    <group userData={{ instancedPartIds: group.parts.map((part) => part.instanceId) }}>
      {meshes.map((mesh, meshIndex) => (
        <instancedMesh
          key={meshIndex}
          ref={(instance) => { refs.current[meshIndex] = instance }}
          args={[mesh.geometry, mesh.material, group.parts.length]}
          onPointerDown={(event) => {
            if (!interactive || event.button !== 0 || event.instanceId == null) return
            event.stopPropagation()
            const part = group.parts[event.instanceId]
            if (part) onSelect(part.instanceId, event.shiftKey)
          }}
        />
      ))}
    </group>
  )
}

export function SceneParts({
  parts,
  chains,
  selectedIds,
  primaryId,
  connectedIds,
  interactive = true,
  showHoles = false,
  detectHoles = false,
  showGizmos = true,
  onSelect,
  onTransform,
  onTransformLive,
  onMoveStart,
  onMoveEnd,
}: {
  parts: PlacedPart[]
  chains: SprocketChain[]
  selectedIds: number[]
  primaryId: number | null
  connectedIds: Set<number>
  interactive?: boolean
  showHoles?: boolean
  detectHoles?: boolean
  showGizmos?: boolean
  onSelect: (id: number, additive: boolean) => void
  onTransform: (
    id: number,
    position: [number, number, number],
    rotation: [number, number, number],
  ) => void
  onTransformLive: (
    id: number,
    position: [number, number, number],
    rotation: [number, number, number],
  ) => void
  onMoveStart: () => void
  onMoveEnd: () => void
}) {
  const selected = new Set(selectedIds)
  const sprocketPhases = useMemo(() => chainSprocketPhases(parts, chains), [chains, parts])
  const { ordinaryParts, instancedGroups } = useMemo(() => {
    const ordinary: PlacedPart[] = []
    const candidates = new Map<string, { parts: PlacedPart[]; details: NonNullable<ReturnType<typeof instancedCatalogDetails>> }>()

    for (const part of parts) {
      const mustStayEditable = selectedIds.includes(part.instanceId)
        || connectedIds.has(part.instanceId)
        || part.instanceId === primaryId
        || showHoles
        || detectHoles
      const details = mustStayEditable ? null : instancedCatalogDetails(part)
      if (!details) {
        ordinary.push(part)
        continue
      }
      const signature = catalogRenderSignature(part)
      const candidate = candidates.get(signature)
      if (candidate) candidate.parts.push(part)
      else candidates.set(signature, { parts: [part], details })
    }

    const groups: InstancedCatalogGroup[] = []
    for (const [signature, candidate] of candidates) {
      if (candidate.parts.length < 2) ordinary.push(...candidate.parts)
      else groups.push({ signature, parts: candidate.parts, ...candidate.details })
    }
    return { ordinaryParts: ordinary, instancedGroups: groups }
  }, [connectedIds, detectHoles, parts, primaryId, selectedIds, showHoles])
  return (
    <>
      {instancedGroups.map((group) => (
        <Suspense key={group.signature} fallback={null}>
          <InstancedCatalogParts group={group} interactive={interactive} onSelect={onSelect} />
        </Suspense>
      ))}
      {ordinaryParts.map((part) => {
        const isSelected = selected.has(part.instanceId)
        const isConnected = connectedIds.has(part.instanceId)
        const outline = isSelected ? 'selected' : isConnected ? 'connected' : null
        return (
          <SelectablePart
            key={part.instanceId}
            partKind={findPart(part.key)?.name ?? part.key}
            outline={outline}
            showGizmo={showGizmos && part.instanceId === primaryId}
            interactive={interactive}
            position={part.position}
            rotation={part.rotation}
            onSelect={(additive) => onSelect(part.instanceId, additive)}
            onTransform={(position, rotation) => onTransform(part.instanceId, position, rotation)}
            onTransformLive={(position, rotation) => onTransformLive(part.instanceId, position, rotation)}
            onMoveStart={onMoveStart}
            onMoveEnd={onMoveEnd}
          >
            <Suspense fallback={<ModelLoadingPlaceholder part={part} />}>
              <PlacedPartMesh
                part={part}
                showHoles={showHoles}
                detectHoles={detectHoles}
                sprocketPhase={sprocketPhases.get(part.instanceId)}
              />
            </Suspense>
          </SelectablePart>
        )
      })}
    </>
  )
}
