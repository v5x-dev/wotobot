import { useFBX } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  type Material,
  type Object3D,
} from 'three'
import { mergeGroups } from 'three/addons/utils/BufferGeometryUtils.js'
import { SelectablePart } from './SelectablePart'
import { holesForPart } from './holes'
import {
  collectChannelPieces,
  getCatalogGeometry,
  holeX,
  indexCatalogMeshes,
  pieceForHole,
} from './channelGeometry'
import {
  channelProfileFromSize,
  findPart,
  modelUrl,
  variantFor,
  type PlacedPart,
} from './parts'

const CATALOG_FBX = '/models/c-channels.fbx'
const SPLIT_FBX = '/models/c-channels-split.fbx'
const MODEL_ROTATION: [number, number, number] = [0, 0, 0]

const aluminum = new MeshStandardMaterial({
  color: '#F2F2F2',
  metalness: 0.754,
  roughness: 0.925,
  side: DoubleSide,
})

const preview = new MeshStandardMaterial({
  color: '#484848',
  metalness: 0.39,
  roughness: 0.73,
  side: DoubleSide,
})

const missing = new MeshStandardMaterial({
  color: '#c45c26',
  metalness: 0.1,
  roughness: 0.8,
})

function noopRaycast() {}

function findNamedObject(root: Object3D, name: string) {
  if (!name) return null
  let exact: Object3D | null = null
  let loose: Object3D | null = null
  const lower = name.toLowerCase()
  root.traverse((obj) => {
    if (obj.name === name) exact = obj
    else if (!loose && obj.name && obj.name.toLowerCase().includes(lower)) loose = obj
  })
  return exact ?? loose
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

type MeshFinish = 'aluminum' | 'model' | 'preview'

function surfaceMaterial(finish: MeshFinish) {
  if (finish === 'preview') return preview
  return aluminum
}

function prepareFbxClone(
  source: Object3D,
  finish: MeshFinish,
  rotation?: [number, number, number],
  color?: [number, number, number] | null,
) {
  const clone = source.clone(true)
  clone.position.set(0, 0, 0)
  clone.scale.setScalar(1)
  if (rotation) clone.rotation.set(...rotation)
  clone.traverse((obj) => {
    if (obj !== clone) {
      obj.position.set(0, 0, 0)
      obj.scale.setScalar(1)
    }

    const mesh = obj as Mesh
    if (!mesh.isMesh) return

    compactMeshGroups(mesh)
    mesh.material =
      finish === 'model'
        ? Array.isArray(mesh.material)
          ? mesh.material.map(toPartMaterial)
          : toPartMaterial(mesh.material)
        : surfaceMaterial(finish)
    if (finish === 'preview') mesh.raycast = noopRaycast
    if (color && finish !== 'preview') {
      const apply = (material: Material) => {
        if (material instanceof MeshStandardMaterial) material.color.setRGB(color[0], color[1], color[2])
      }
      if (Array.isArray(mesh.material)) mesh.material.forEach(apply)
      else apply(mesh.material)
    }
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

  return (
    <group>
      {Array.from({ length: holes }, (_, index) => {
        const { geometry, flip } = pieceForHole(profilePieces, index + 1)
        return (
          <mesh
            key={index}
            geometry={geometry}
            material={material}
            position={[holeX(index, holes), 0, 0]}
            rotation-z={flip ? Math.PI : 0}
            {...(material === preview ? { raycast: noopRaycast } : {})}
          />
        )
      })}
    </group>
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
  const catalogFbx = useFBX(CATALOG_FBX)
  const splitFbx = useFBX(SPLIT_FBX)
  const catalog = useMemo(() => indexCatalogMeshes(catalogFbx), [catalogFbx])
  const pieces = useMemo(() => collectChannelPieces(splitFbx), [splitFbx])
  const profile = channelProfileFromSize(size)
  const geometry = getCatalogGeometry(catalog, profile, holes)

  if (geometry) {
    return (
      <mesh
        geometry={geometry}
        material={material}
        {...(material === preview ? { raycast: noopRaycast } : {})}
      />
    )
  }

  return <AssembledChannel pieces={pieces} profile={profile} holes={holes} material={material} />
}

function FbxMeshPart({
  url,
  meshName,
  scale,
  rotation,
  finish = 'model',
  color = null,
}: {
  url: string
  meshName: string
  scale?: [number, number, number]
  rotation?: [number, number, number]
  finish?: MeshFinish
  color?: [number, number, number] | null
}) {
  const fbx = useFBX(url)
  const object = useMemo(() => {
    const source = findNamedObject(fbx, meshName) ?? firstMesh(fbx) ?? fbx
    return prepareFbxClone(source, finish, rotation, color)
  }, [fbx, meshName, finish, rotation, color])

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

function HoleColliders({
  part,
  show,
}: {
  part: PlacedPart
  show: boolean
}) {
  const holes = useMemo(
    () => holesForPart(part),
    [part.key, part.param1, part.param2],
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
  if (isPreview) return preview
  if (!color) return aluminum
  const material = aluminum.clone()
  material.color.setRGB(color[0], color[1], color[2])
  return material
}

export function PlacedPartMesh({
  part,
  preview: isPreview = false,
  showHoles = false,
  detectHoles = false,
}: {
  part: PlacedPart
  preview?: boolean
  showHoles?: boolean
  detectHoles?: boolean
}) {
  const definition = findPart(part.key)
  const material = aluminumMaterial(part.color, isPreview)
  const finish: MeshFinish = isPreview ? 'preview' : 'aluminum'
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

  if (definition.id === 'CCHL' && definition.generator === 'aluminum') {
    const holeCount = Number(part.param2) || 15
    return (
      <>
        <ChannelPart size={part.param1} holes={holeCount} material={material} />
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
        rotation={MODEL_ROTATION}
        finish={isPreview ? 'preview' : 'model'}
        color={part.color}
      />
      {holes}
    </>
  )
}

export function SceneParts({
  parts,
  selectedIds,
  primaryId,
  connectedIds,
  interactive = true,
  showHoles = false,
  detectHoles = false,
  showGizmos = true,
  onSelect,
  onTransform,
  onMoveStart,
  onMoveEnd,
}: {
  parts: PlacedPart[]
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
  onMoveStart: () => void
  onMoveEnd: () => void
}) {
  const selected = new Set(selectedIds)
  return (
    <>
      {parts.map((part) => {
        const isSelected = selected.has(part.instanceId)
        const isConnected = connectedIds.has(part.instanceId)
        const outline = isSelected ? 'selected' : isConnected ? 'connected' : null
        return (
          <SelectablePart
            key={part.instanceId}
            outline={outline}
            showGizmo={showGizmos && part.instanceId === primaryId}
            interactive={interactive}
            position={part.position}
            rotation={part.rotation}
            onSelect={(additive) => onSelect(part.instanceId, additive)}
            onTransform={(position, rotation) => onTransform(part.instanceId, position, rotation)}
            onMoveStart={onMoveStart}
            onMoveEnd={onMoveEnd}
          >
            <Suspense>
              <PlacedPartMesh part={part} showHoles={showHoles} detectHoles={detectHoles} />
            </Suspense>
          </SelectablePart>
        )
      })}
    </>
  )
}

useFBX.preload(CATALOG_FBX)
useFBX.preload(SPLIT_FBX)
