/** True while a transform-gizmo handle owns the current pointerdown. */
let active = false

export function setGizmoPointerTarget(value: boolean) {
  active = value
}

/** Skip part/chain selection so the gizmo can start its drag instead. */
export function consumeGizmoPointer(event: { stopPropagation: () => void }) {
  if (!active) return false
  event.stopPropagation()
  return true
}
