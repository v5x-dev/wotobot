import { Quaternion, Vector3 } from 'three'
import { holesForPart, type HoleTemplate, type HoleType } from './holes'
import { eulerToQuat, worldForward, worldPosition } from './math'
import { findPart, type PlacedPart } from './parts'

export type WorldHole = HoleTemplate & {
  partId: number
  worldPosition: Vector3
  worldForward: Vector3
}

const DETECTOR_RADIUS = 0.08
const _origin = new Vector3()
const _forward = new Vector3()
const _offset = new Vector3()
const _quat = new Quaternion()

function partForward(part: PlacedPart, target: Vector3) {
  eulerToQuat(part.rotation, _quat)
  return target.set(0, 0, 1).applyQuaternion(_quat).normalize()
}

export function worldHolesFor(part: PlacedPart): WorldHole[] {
  return holesForPart(part).map((hole) => ({
    ...hole,
    partId: part.instanceId,
    worldPosition: worldPosition(hole.position, part.position, part.rotation, new Vector3()),
    worldForward: worldForward(hole.rotation, part.rotation, new Vector3()),
  }))
}

export function allWorldHoles(parts: PlacedPart[]) {
  return parts.flatMap(worldHolesFor)
}

function alongAxis(
  holes: WorldHole[],
  origin: Vector3,
  forward: Vector3,
  length: number,
  radius = DETECTOR_RADIUS,
) {
  const lenSq = length * length
  const found: { hole: WorldHole; t: number }[] = []
  for (const hole of holes) {
    _offset.copy(hole.worldPosition).sub(origin)
    const t = _offset.dot(forward)
    if (t < -0.05 || t > length + 0.05) continue
    const distSq = _offset.lengthSq() - t * t
    if (distSq > radius * radius) continue
    if (t * t > lenSq + length) continue
    found.push({ hole, t })
  }
  found.sort((a, b) => a.t - b.t)
  return found
}

function link(graph: Map<number, Set<number>>, a: number, b: number) {
  if (a === b) return
  let group = graph.get(a)
  if (!group) {
    group = new Set()
    graph.set(a, group)
  }
  group.add(b)
  let other = graph.get(b)
  if (!other) {
    other = new Set()
    graph.set(b, other)
  }
  other.add(a)
}

export function connectionGraph(parts: PlacedPart[]) {
  const graph = new Map<number, Set<number>>()
  const holes = allWorldHoles(parts)

  for (const part of parts) {
    const definition = findPart(part.key)
    if (!definition?.connectingPart) continue
    partForward(part, _forward)
    _origin.set(...part.position)

    if (definition.id === 'SCRW') {
      const length = Number(part.param2) || 0.5
      const start = _origin.clone().addScaledVector(_forward, -length)
      const along = alongAxis(
        holes.filter((hole) => hole.partId !== part.instanceId),
        start,
        _forward,
        length,
      )
      let connect = false
      for (let i = along.length - 1; i >= 0; i -= 1) {
        if (along[i].hole.type === 'threaded') connect = true
        if (connect) link(graph, part.instanceId, along[i].hole.partId)
      }
    }

    if (definition.id === 'SHFT') {
      const length = Number(part.param2) || 6
      const start = _origin.clone().addScaledVector(_forward, -length / 2)
      const along = alongAxis(
        holes.filter((hole) => hole.partId !== part.instanceId),
        start,
        _forward,
        length,
      )
      const clampIndexes = along
        .map((item, index) => (item.hole.type === 'clamp' ? index : -1))
        .filter((index) => index >= 0)
      if (clampIndexes.length < 2) continue
      const first = clampIndexes[0]
      const last = clampIndexes[clampIndexes.length - 1]
      for (let i = first; i <= last; i += 1) {
        link(graph, part.instanceId, along[i].hole.partId)
      }
    }
  }

  return graph
}

export function connectedIds(partId: number, graph: Map<number, Set<number>>) {
  const ids = new Set<number>([partId])
  const stack = [partId]
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const next of graph.get(current) ?? []) {
      if (ids.has(next)) continue
      ids.add(next)
      stack.push(next)
    }
  }
  return ids
}

export function unionConnected(ids: Iterable<number>, graph: Map<number, Set<number>>) {
  const all = new Set<number>()
  for (const id of ids) {
    for (const member of connectedIds(id, graph)) all.add(member)
  }
  return all
}

export function effectiveGraph(parts: PlacedPart[]) {
  const graph = connectionGraph(parts)
  const membersByGroup = new Map<number, number[]>()
  for (const part of parts) {
    if (!part.groupId) continue
    const members = membersByGroup.get(part.groupId)
    if (members) members.push(part.instanceId)
    else membersByGroup.set(part.groupId, [part.instanceId])
  }
  for (const members of membersByGroup.values()) {
    for (let i = 1; i < members.length; i += 1) link(graph, members[0], members[i])
  }
  return graph
}

export function isTargetHoleType(type: HoleType, connectingId: string) {
  if (connectingId === 'SCRW') return type === 'threaded'
  if (connectingId === 'SHFT') return type === 'clamp'
  return false
}
