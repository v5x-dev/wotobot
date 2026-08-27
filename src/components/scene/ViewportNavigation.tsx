import { useThree } from '@react-three/fiber'
import { Bug, CircleDotDashed, Grid3X3, Hand, Waypoints, ZoomIn } from 'lucide-react'
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { MathUtils, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type DragMode = 'zoom' | 'pan'

export type ViewportNavigationController = {
  drag: (mode: DragMode, dx: number, dy: number) => void
  end: () => void
}

const MIN_DISTANCE = 0.5
const MAX_DISTANCE = 1000
const ZOOM_SPEED = 0.01

export function ViewportNavigationBridge({
  onReady,
}: {
  onReady: (controller: ViewportNavigationController | null) => void
}) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) as OrbitControls | undefined
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)

  useEffect(() => {
    if (!controls) return
    const offset = new Vector3()
    const right = new Vector3()
    const up = new Vector3()
    const controller: ViewportNavigationController = {
      drag(mode, dx, dy) {
        if (mode === 'zoom') {
          const factor = Math.exp(dy * ZOOM_SPEED)
          if (camera instanceof OrthographicCamera) {
            camera.zoom = MathUtils.clamp(camera.zoom / factor, 0.01, 1000)
            camera.updateProjectionMatrix()
          } else {
            offset.copy(camera.position).sub(controls.target)
            const distance = MathUtils.clamp(offset.length() * factor, MIN_DISTANCE, MAX_DISTANCE)
            if (offset.lengthSq() > 0) camera.position.copy(controls.target).add(offset.setLength(distance))
          }
        } else {
          const distance = camera instanceof PerspectiveCamera
            ? camera.position.distanceTo(controls.target)
            : (camera.top - camera.bottom) / (2 * camera.zoom)
          const worldPerPixel = camera instanceof PerspectiveCamera
            ? 2 * distance * Math.tan(MathUtils.degToRad(camera.fov / 2)) / Math.max(size.height, 1)
            : 2 * distance / Math.max(size.height, 1)
          offset
            .copy(right.setFromMatrixColumn(camera.matrixWorld, 0))
            .multiplyScalar(-dx * worldPerPixel)
            .addScaledVector(up.setFromMatrixColumn(camera.matrixWorld, 1), dy * worldPerPixel)
          camera.position.add(offset)
          controls.target.add(offset)
        }
        controls.update()
        invalidate()
      },
      end() {
        controls.dispatchEvent({ type: 'end' })
      },
    }
    onReady(controller)
    return () => onReady(null)
  }, [camera, controls, invalidate, onReady, size.height])

  return null
}

function NavigationButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={label} {...props}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  )
}

export function ViewportNavigation({
  controller,
  ortho,
  onToggleProjection,
  showHoles,
  onToggleHoles,
  showDebug,
  onToggleDebug,
  wireframe,
  onToggleWireframe,
  holesHotkey,
}: {
  controller: ViewportNavigationController | null
  ortho: boolean
  onToggleProjection: () => void
  showHoles: boolean
  onToggleHoles: () => void
  showDebug: boolean
  onToggleDebug: () => void
  wireframe: boolean
  onToggleWireframe: () => void
  holesHotkey: string
}) {
  const drag = useRef<{ mode: DragMode; x: number; y: number } | null>(null)

  function beginDrag(mode: DragMode, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!controller) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { mode, x: event.clientX, y: event.clientY }
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current || !controller) return
    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    current.x = event.clientX
    current.y = event.clientY
    controller.drag(current.mode, dx, dy)
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current || !controller) return
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    controller.end()
  }

  const dragButtonClass = 'cursor-move touch-none'
  return (
    <div className="pointer-events-auto absolute top-[92px] right-3 z-20 flex h-fit w-fit flex-col gap-1 rounded-lg border border-sidebar-border bg-sidebar p-1 shadow-sm">
      <NavigationButton
        label="Zoom view (drag)"
        variant="ghost"
        size="icon-sm"
        className={dragButtonClass}
        disabled={!controller}
        onPointerDown={(event) => beginDrag('zoom', event)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <ZoomIn />
      </NavigationButton>
      <NavigationButton
        label="Pan view (drag)"
        variant="ghost"
        size="icon-sm"
        className={dragButtonClass}
        disabled={!controller}
        onPointerDown={(event) => beginDrag('pan', event)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Hand />
      </NavigationButton>
      <NavigationButton
        label={ortho ? 'Switch to perspective view' : 'Switch to orthographic view'}
        variant={ortho ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-pressed={ortho}
        onClick={onToggleProjection}
      >
        <Grid3X3 />
      </NavigationButton>
      <div className="mx-1 my-0.5 h-px bg-sidebar-border" />
      <NavigationButton
        label={`${showHoles ? 'Hide' : 'Show'} all holes (${holesHotkey})`}
        variant={showHoles ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-pressed={showHoles}
        onClick={onToggleHoles}
      >
        <CircleDotDashed />
      </NavigationButton>
      <NavigationButton
        label={`${showDebug ? 'Hide' : 'Show'} debug overlay`}
        variant={showDebug ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-pressed={showDebug}
        onClick={onToggleDebug}
      >
        <Bug />
      </NavigationButton>
      {showDebug ? (
        <NavigationButton
          label={`${wireframe ? 'Disable' : 'Enable'} wireframe view`}
          variant={wireframe ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-pressed={wireframe}
          onClick={onToggleWireframe}
        >
          <Waypoints />
        </NavigationButton>
      ) : null}
    </div>
  )
}
