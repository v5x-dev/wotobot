import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  MeshStandardMaterial,
  Path,
  Quaternion,
  Shape,
  Vector3,
  type InstancedMesh,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  chainGeometry,
  resampleClosedPath,
  sprocketPitchRadius,
  sprocketRotationPhase,
  type ChainKind,
  type SprocketChain,
} from '@/model/chains'
import type { PlacedPart } from '@/model/parts'
import { consumeGizmoPointer } from './gizmoPointer'

const chainMaterial = new MeshStandardMaterial({
  color: '#F2F2F2',
  metalness: 0.02,
  roughness: 0.72,
})

const selectedChainMaterial = chainMaterial.clone()
selectedChainMaterial.color.set('#3EA6FF')
selectedChainMaterial.emissive.set('#123c5c')

function noopRaycast() {}

/** Reduced mesh of one VEX acetal master link. Dimensions are inches. */
function makeLinkGeometry(kind: ChainKind) {
  const highStrength = kind === 'high-strength'
  const pitch = highStrength ? 0.385 : 0.148
  const length = pitch * 1.08
  const railHeight = highStrength ? 0.16 : 0.066
  const width = highStrength ? 0.57 : 0.22
  const holeRadius = highStrength ? 0.067 : 0.027
  const railThickness = highStrength ? 0.075 : 0.03
  const endRadius = railHeight / 2
  const halfStraight = length / 2 - endRadius

  const shape = new Shape()
  shape.moveTo(-halfStraight, -endRadius)
  shape.lineTo(halfStraight, -endRadius)
  shape.absarc(halfStraight, 0, endRadius, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(-halfStraight, endRadius)
  shape.absarc(-halfStraight, 0, endRadius, Math.PI / 2, Math.PI * 1.5, false)

  for (const x of [-pitch / 2, pitch / 2]) {
    const hole = new Path()
    hole.absarc(x, 0, holeRadius, 0, Math.PI * 2, true)
    shape.holes.push(hole)
  }

  const bevel = highStrength ? 0.012 : 0.005
  const rail = new ExtrudeGeometry(shape, {
    depth: railThickness,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 12,
    steps: 1,
  })
  const railOffset = width / 2 - railThickness / 2
  const leftRail = rail.clone().translate(0, 0, -railOffset - railThickness / 2)
  const rightRail = rail.clone().translate(0, 0, railOffset - railThickness / 2)

  // The hinge roller joins the two side arms. The center stays open for sprocket teeth.
  const pin = new CylinderGeometry(
    holeRadius * 0.72,
    holeRadius * 0.72,
    width,
    12,
  )
  pin.rotateX(Math.PI / 2)
  pin.translate(pitch / 2, 0, 0)

  const parts = [leftRail, rightRail, pin].map((part) =>
    part.index ? part.toNonIndexed() : part.clone(),
  )
  const geometry = mergeGeometries(parts)
  if (!geometry) throw new Error('Unable to build chain link geometry.')
  geometry.computeVertexNormals()
  rail.dispose()
  leftRail.dispose()
  rightRail.dispose()
  pin.dispose()
  parts.forEach((part) => part.dispose())
  return geometry
}

const standardLinkGeometry = makeLinkGeometry('standard')
const highStrengthLinkGeometry = makeLinkGeometry('high-strength')

const _axis = new Vector3()
const _current = new Vector3()
const _next = new Vector3()
const _midpoint = new Vector3()
const _tangent = new Vector3()
const _side = new Vector3()
const _rotation = new Quaternion()
const _basis = new Matrix4()
const _scale = new Vector3(1, 1, 1)

function makeChainMatrices(a: PlacedPart, b: PlacedPart) {
  const geometry = chainGeometry(a, b)
  if (!geometry) return null
  const travel = -sprocketPitchRadius(a) * sprocketRotationPhase(a)
  const points = resampleClosedPath(geometry.points, geometry.pitch, travel)
  if (points.length < 4) return null

  _axis.set(...geometry.axis).normalize()
  const matrices: Matrix4[] = []

  for (let index = 0; index < points.length; index += 1) {
    _current.set(...points[index])
    _next.set(...points[(index + 1) % points.length])

    // Path samples are hinge centers. Place the solid link between adjacent hinges.
    _tangent.copy(_next).sub(_current)
    if (_tangent.lengthSq() < 1e-8) continue
    _tangent.normalize()
    _midpoint.copy(_current).add(_next).multiplyScalar(0.5)
    _side.copy(_axis).cross(_tangent).normalize()
    _basis.makeBasis(_tangent, _side, _axis)
    _rotation.setFromRotationMatrix(_basis)
    matrices.push(new Matrix4().compose(_midpoint.clone(), _rotation.clone(), _scale))
  }

  return { kind: geometry.kind, matrices }
}

function ChainMesh({
  a,
  b,
  selected,
  interactive,
  onSelect,
}: {
  a: PlacedPart
  b: PlacedPart
  selected: boolean
  interactive: boolean
  onSelect: () => void
}) {
  const linksRef = useRef<InstancedMesh>(null)
  const chain = useMemo(() => makeChainMatrices(a, b), [a, b])

  useLayoutEffect(() => {
    const links = linksRef.current
    if (!chain || !links) return
    chain.matrices.forEach((matrix, index) => links.setMatrixAt(index, matrix))
    links.instanceMatrix.needsUpdate = true
    links.computeBoundingSphere()
  }, [chain])

  if (!chain) return null
  const linkGeometry = chain.kind === 'high-strength'
    ? highStrengthLinkGeometry
    : standardLinkGeometry

  return (
    <instancedMesh
      ref={linksRef}
      args={[linkGeometry, undefined, chain.matrices.length]}
      material={selected ? selectedChainMaterial : chainMaterial}
      frustumCulled={false}
      raycast={interactive ? undefined : noopRaycast}
      onPointerDown={(event) => {
        if (!interactive || event.button !== 0) return
        event.stopPropagation()
        if (consumeGizmoPointer(event)) return
        onSelect()
      }}
    />
  )
}

export function SprocketChains({
  parts,
  chains,
  selectedChainId,
  interactive = true,
  onSelect,
}: {
  parts: PlacedPart[]
  chains: SprocketChain[]
  selectedChainId: number | null
  interactive?: boolean
  onSelect: (id: number) => void
}) {
  const partById = useMemo(
    () => new Map(parts.map((part) => [part.instanceId, part])),
    [parts],
  )

  return (
    <>
      {chains.map((chain) => {
        const a = partById.get(chain.sprocketAId)
        const b = partById.get(chain.sprocketBId)
        return a && b ? (
          <ChainMesh
            key={chain.id}
            a={a}
            b={b}
            selected={chain.id === selectedChainId}
            interactive={interactive}
            onSelect={() => onSelect(chain.id)}
          />
        ) : null
      })}
    </>
  )
}
