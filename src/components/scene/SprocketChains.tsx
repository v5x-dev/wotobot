import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from 'three'
import {
  chainGeometry,
  resampleClosedPath,
  type SprocketChain,
} from '@/model/chains'
import type { PlacedPart } from '@/model/parts'

const plateMaterial = new MeshStandardMaterial({
  color: '#303236',
  metalness: 0.72,
  roughness: 0.48,
})

const rollerMaterial = new MeshStandardMaterial({
  color: '#8a8d91',
  metalness: 0.8,
  roughness: 0.36,
})

const _axis = new Vector3()
const _current = new Vector3()
const _next = new Vector3()
const _tangent = new Vector3()
const _side = new Vector3()
const _midpoint = new Vector3()
const _position = new Vector3()
const _scale = new Vector3()
const _rotation = new Quaternion()
const _basis = new Matrix4()
const _up = new Vector3(0, 1, 0)

function makeChainMatrices(a: PlacedPart, b: PlacedPart) {
  const geometry = chainGeometry(a, b)
  if (!geometry) return null
  const points = resampleClosedPath(geometry.points, geometry.pitch)
  if (points.length < 4) return null

  _axis.set(...geometry.axis).normalize()
  const rollerRotation = new Quaternion().setFromUnitVectors(_up, _axis)
  const rollerMatrices: Matrix4[] = []
  const plateMatrices: Matrix4[] = []
  const linkScale = geometry.pitch / 0.25
  const widthScale = Math.sqrt(linkScale)
  const plateOffset = 0.0675 * widthScale
  const plateWidth = 0.105 * linkScale
  const plateThickness = 0.035 * widthScale
  const endGap = 0.065 * linkScale

  for (let index = 0; index < points.length; index += 1) {
    _current.set(...points[index])
    _next.set(...points[(index + 1) % points.length])
    _tangent.copy(_next).sub(_current)
    const length = _tangent.length()
    if (length < 1e-6) continue
    _tangent.multiplyScalar(1 / length)
    _side.copy(_axis).cross(_tangent).normalize()
    _basis.makeBasis(_tangent, _side, _axis)
    _rotation.setFromRotationMatrix(_basis)
    _midpoint.copy(_current).add(_next).multiplyScalar(0.5)

    rollerMatrices.push(
      new Matrix4().compose(_current.clone(), rollerRotation, new Vector3(1, 1, 1)),
    )

    for (const offset of [-plateOffset, plateOffset]) {
      _position.copy(_midpoint).addScaledVector(_axis, offset)
      _scale.set(Math.max(0.025, length - endGap), plateWidth, plateThickness)
      plateMatrices.push(
        new Matrix4().compose(_position.clone(), _rotation.clone(), _scale.clone()),
      )
    }
  }

  return {
    rollerMatrices,
    plateMatrices,
    rollerRadius: 0.055 * linkScale,
    rollerLength: 0.17 * widthScale,
  }
}

function ChainMesh({ a, b }: { a: PlacedPart; b: PlacedPart }) {
  const rollersRef = useRef<InstancedMesh>(null)
  const platesRef = useRef<InstancedMesh>(null)
  const matrices = useMemo(
    () => makeChainMatrices(a, b),
    [a, b],
  )

  useLayoutEffect(() => {
    if (!matrices) return
    const rollers = rollersRef.current
    const plates = platesRef.current
    if (!rollers || !plates) return
    matrices.rollerMatrices.forEach((matrix, index) => rollers.setMatrixAt(index, matrix))
    matrices.plateMatrices.forEach((matrix, index) => plates.setMatrixAt(index, matrix))
    rollers.instanceMatrix.needsUpdate = true
    plates.instanceMatrix.needsUpdate = true
  }, [matrices])

  if (!matrices) return null

  return (
    <group>
      <instancedMesh
        ref={rollersRef}
        args={[undefined, undefined, matrices.rollerMatrices.length]}
        material={rollerMaterial}
        frustumCulled={false}
        raycast={() => {}}
      >
        <cylinderGeometry
          args={[matrices.rollerRadius, matrices.rollerRadius, matrices.rollerLength, 12]}
        />
      </instancedMesh>
      <instancedMesh
        ref={platesRef}
        args={[undefined, undefined, matrices.plateMatrices.length]}
        material={plateMaterial}
        frustumCulled={false}
        raycast={() => {}}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  )
}

export function SprocketChains({
  parts,
  chains,
}: {
  parts: PlacedPart[]
  chains: SprocketChain[]
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
        return a && b ? <ChainMesh key={chain.id} a={a} b={b} /> : null
      })}
    </>
  )
}
