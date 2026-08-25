import { afterEach, expect, it, vi } from 'vitest'
import { consumeGizmoPointer, setGizmoPointerTarget } from './gizmoPointer'

afterEach(() => {
  setGizmoPointerTarget(false)
})

it('lets part clicks through when the gizmo is idle', () => {
  const stop = vi.fn()
  expect(consumeGizmoPointer({ stopPropagation: stop })).toBe(false)
  expect(stop).not.toHaveBeenCalled()
})

it('swallows part clicks while a gizmo handle is picked', () => {
  setGizmoPointerTarget(true)
  const stop = vi.fn()
  expect(consumeGizmoPointer({ stopPropagation: stop })).toBe(true)
  expect(stop).toHaveBeenCalled()
})
