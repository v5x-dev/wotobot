import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  Check,
  Circle,
  Maximize2,
  MousePointer2,
  Redo2,
  RotateCcw,
  SquarePen,
  Trash2,
  TriangleAlert,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SCREW_HOLE_DIAMETER, SCREW_HOLE_SPACING } from '@/model/holes'
import { MAX_FOOTPRINT_LONG, MAX_FOOTPRINT_SHORT } from '@/model/polycarbonateLimits'
import { pointInPolygon, rectanglePolygon } from '@/model/parts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Point = [number, number]
type Tool = 'outline' | 'holes'
type Draft = { points: Point[]; holes: Point[] }
type Selection = { kind: 'corner' | 'hole'; index: number } | null
type ViewBounds = { minX: number; minY: number; width: number; height: number }

const SNAP = 0.25
const SIZE_EPSILON = 1e-4

const FIT_MARGIN_PX = 52
const MAX_ZOOM_PX_PER_IN = 120
const FALLBACK_VIEW = { width: 1180, height: 620 }

const EDGE_HIT_PX = 22
const HANDLE_R_PX = 5.5
const HANDLE_HIT_R_PX = 17
const HOLE_HIT_R_PX = 14

const HOLE_COLOR = '#3EA6FF'

type Palette = { bg: string; ink: string; muted: string; danger: string }

const FALLBACK_PALETTE: Palette = { bg: '#181818', ink: '#fafafa', muted: '#a1a1aa', danger: '#ff6b6b' }

function readPalette(): Palette {
  if (typeof document === 'undefined') return FALLBACK_PALETTE
  const styles = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
  return {
    bg: token('--background', FALLBACK_PALETTE.bg),
    ink: token('--foreground', FALLBACK_PALETTE.ink),
    muted: token('--muted-foreground', FALLBACK_PALETTE.muted),
    danger: token('--destructive', FALLBACK_PALETTE.danger),
  }
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000
}

function snapValue(value: number, step: number) {
  return step > 0 ? Math.round(value / step) * step : round3(value)
}

function snapPoint(point: Point, step: number): Point {
  return [snapValue(point[0], step), snapValue(point[1], step)]
}

function fmt(value: number) {
  return String(round3(Number(value.toFixed(2))))
}

function aabb(points: Point[]) {
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: Math.max(maxX - minX, 1e-6), height: Math.max(maxY - minY, 1e-6) }
}

function boundsFor(points: Point[], cssWidth = FALLBACK_VIEW.width, cssHeight = FALLBACK_VIEW.height): ViewBounds {
  const box = aabb(points)
  const usableW = Math.max(cssWidth - FIT_MARGIN_PX * 2, 60)
  const usableH = Math.max(cssHeight - FIT_MARGIN_PX * 2, 60)
  const zoom = Math.min(Math.min(usableW / box.width, usableH / box.height), MAX_ZOOM_PX_PER_IN)
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  const width = cssWidth / zoom
  const height = cssHeight / zoom
  return { minX: cx - width / 2, minY: cy - height / 2, width, height }
}

function projectOnEdge(start: Point, end: Point, point: Point): Point {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const lengthSquared = dx * dx + dy * dy
  const amount = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared))
  return [start[0] + amount * dx, start[1] + amount * dy]
}

function samePoints(a: Point[], b: Point[]) {
  return a.length === b.length && a.every(([x, y], index) => x === b[index][0] && y === b[index][1])
}

function holeKey(point: Point) {
  return `${point[0]},${point[1]}`
}

function holeFits(center: Point, polygon: Point[]) {
  const radius = SCREW_HOLE_DIAMETER / 2
  if (!pointInPolygon(center, polygon)) return false
  return (
    pointInPolygon([center[0] + radius, center[1]], polygon)
    && pointInPolygon([center[0] - radius, center[1]], polygon)
    && pointInPolygon([center[0], center[1] + radius], polygon)
    && pointInPolygon([center[0], center[1] - radius], polygon)
  )
}

function holeCandidates(points: Point[]) {
  if (points.length < 3) return []
  const box = aabb(points)
  const startX = Math.ceil(box.minX / SCREW_HOLE_SPACING) * SCREW_HOLE_SPACING
  const startY = Math.ceil(box.minY / SCREW_HOLE_SPACING) * SCREW_HOLE_SPACING
  const result: Point[] = []
  for (let x = startX; x <= box.maxX + 1e-9; x += SCREW_HOLE_SPACING) {
    for (let y = startY; y <= box.maxY + 1e-9; y += SCREW_HOLE_SPACING) {
      const point = snapPoint([x, y], SCREW_HOLE_SPACING)
      if (holeFits(point, points)) result.push(point)
    }
  }
  return result
}

function polygonAreaOf(points: Point[]) {
  return Math.abs(points.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length]
    return sum + x * nextY - nextX * y
  }, 0)) / 2
}

function fitsFootprint(width: number, height: number) {
  const short = Math.min(width, height)
  const long = Math.max(width, height)
  return short <= MAX_FOOTPRINT_SHORT + SIZE_EPSILON && long <= MAX_FOOTPRINT_LONG + SIZE_EPSILON
}

function Chip({ tone = 'neutral', title, children }: { tone?: 'neutral' | 'bad'; title?: string; children: ReactNode }) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 tabular-nums',
        tone === 'neutral' && 'border-border text-muted-foreground',
        tone === 'bad' && 'border-destructive/40 bg-destructive/10 text-destructive',
      )}
    >
      {children}
    </span>
  )
}

export function PolycarbonateShapeEditor({
  points,
  holes,
  fallbackWidth,
  fallbackHeight,
  onChange,
}: {
  points: Point[]
  holes: Point[]
  fallbackWidth: number
  fallbackHeight: number
  onChange: (points: Point[], holes: Point[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [tool, setTool] = useState<Tool>('outline')
  const [draft, setDraft] = useState<Draft>({ points, holes })
  const [past, setPast] = useState<Draft[]>([])
  const [future, setFuture] = useState<Draft[]>([])
  const [selected, setSelected] = useState<Selection>(null)
  const [hoveredEdge, setHoveredEdge] = useState<{ index: number; point: Point } | null>(null)
  const [hoveredCorner, setHoveredCorner] = useState<number | null>(null)
  const [hoverSpot, setHoverSpot] = useState<Point | null>(null)
  const [bounds, setBounds] = useState<ViewBounds>(() => boundsFor(points))
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [palette, setPalette] = useState<Palette>(FALLBACK_PALETTE)

  const svgRef = useRef<SVGSVGElement>(null)
  const draftRef = useRef(draft)
  const dragRef = useRef<{ kind: 'corner' | 'hole'; index: number; snapshot: Draft } | null>(null)
  const fitKeyRef = useRef('')
  const observerRef = useRef<ResizeObserver | null>(null)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const attachWrapRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setCanvasSize({ width, height })
      if (width < 80 || height < 80) return
      const key = `${Math.round(width)}x${Math.round(height)}`
      if (fitKeyRef.current === key) return
      fitKeyRef.current = key
      setBounds(boundsFor(draftRef.current.points, width, height))
    })
    observerRef.current = observer
    observer.observe(node)
  }, [])

  const { points: draftPoints, holes: draftHoles } = draft
  const cssWidth = canvasSize.width || FALLBACK_VIEW.width
  const worldPerPx = bounds.width / cssWidth
  const px = (screenPx: number) => screenPx * worldPerPx
  const dirty = !samePoints(draftPoints, points) || !samePoints(draftHoles, holes)

  const dims = useMemo(() => aabb(draftPoints), [draftPoints])
  const area = useMemo(() => polygonAreaOf(draftPoints), [draftPoints])
  const footprintOk = fitsFootprint(dims.width, dims.height)
  const candidates = useMemo(() => (tool === 'holes' ? holeCandidates(draftPoints) : []), [tool, draftPoints])
  const placedKeys = useMemo(() => new Set(draftHoles.map(holeKey)), [draftHoles])

  const gridLines = useMemo(() => {
    let major = 0.125
    while (major / worldPerPx < 84 && major < 64) major *= 2
    const minorCandidate = major / 4
    const minor = minorCandidate / worldPerPx >= 16 ? minorCandidate : null
    const startX = Math.floor(bounds.minX / major) * major
    const startY = Math.floor(bounds.minY / major) * major
    const verticals: { x: number; major: boolean }[] = []
    const horizontals: { y: number; major: boolean }[] = []
    const stepX = minor ?? major
    const stepY = minor ?? major
    for (let x = startX; x <= bounds.minX + bounds.width + 1e-9; x += stepX) {
      verticals.push({ x: round3(x), major: Math.abs(x % major) < 1e-6 })
    }
    for (let y = startY; y <= bounds.minY + bounds.height + 1e-9; y += stepY) {
      horizontals.push({ y: round3(y), major: Math.abs(y % major) < 1e-6 })
    }
    return { verticals, horizontals }
  }, [bounds, worldPerPx])

  function resetSession(nextPoints: Point[], nextHoles: Point[]) {
    setDraft({ points: nextPoints.map(([x, y]) => [x, y]), holes: nextHoles.map(([x, y]) => [x, y]) })
    setPast([])
    setFuture([])
    setSelected(null)
    setHoveredEdge(null)
    setHoveredCorner(null)
    setHoverSpot(null)
    setTool('outline')
    fitKeyRef.current = ''
    setPalette(readPalette())
    setBounds(boundsFor(nextPoints))
  }

  function applyDraft(next: Draft) {
    setPast((current) => [...current.slice(-49), draftRef.current])
    setFuture([])
    setDraft(next)
  }

  function undo() {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    setPast(past.slice(0, -1))
    setFuture([draftRef.current, ...future])
    setDraft(previous)
    setSelected(null)
  }

  function redo() {
    if (future.length === 0) return
    const next = future[0]
    setFuture(future.slice(1))
    setPast([...past, draftRef.current])
    setDraft(next)
    setSelected(null)
  }

  function eventWorld(event: ReactPointerEvent): Point {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) return [0, 0]
    const screen = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return [screen.x, -screen.y]
  }

  function clampToView(point: Point): Point {
    const inset = 0.15
    return [
      Math.min(Math.max(point[0], bounds.minX + inset), bounds.minX + bounds.width - inset),
      Math.min(Math.max(point[1], bounds.minY + inset), bounds.minY + bounds.height - inset),
    ]
  }

  function finishDrag() {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (JSON.stringify(drag.snapshot) !== JSON.stringify(draftRef.current)) {
      setPast((current) => [...current.slice(-49), drag.snapshot])
      setFuture([])
    }
  }

  function beginCornerDrag(event: ReactPointerEvent<SVGCircleElement>, index: number) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { kind: 'corner', index, snapshot: draftRef.current }
    setSelected({ kind: 'corner', index })
  }

  function dragCorner(event: ReactPointerEvent<SVGCircleElement>, index: number) {
    const drag = dragRef.current
    if (!drag || drag.kind !== 'corner' || drag.index !== index) return
    const next = clampToView(snapPoint(eventWorld(event), event.altKey ? 0 : SNAP))
    setDraft((current) => ({
      ...current,
      points: current.points.map((point, pointIndex) => (pointIndex === index ? next : point)),
    }))
  }

  function beginHoleDrag(event: ReactPointerEvent<SVGCircleElement>, index: number) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { kind: 'hole', index, snapshot: draftRef.current }
    setSelected({ kind: 'hole', index })
  }

  function dragHole(event: ReactPointerEvent<SVGCircleElement>, index: number) {
    const drag = dragRef.current
    if (!drag || drag.kind !== 'hole' || drag.index !== index) return
    const next = snapPoint(eventWorld(event), SCREW_HOLE_SPACING)
    if (!holeFits(next, draftRef.current.points)) return
    if (draftRef.current.holes.some((other, otherIndex) => otherIndex !== index && holeKey(other) === holeKey(next))) return
    setDraft((current) => ({
      ...current,
      holes: current.holes.map((point, holeIndex) => (holeIndex === index ? next : point)),
    }))
  }

  function hoverEdge(event: ReactPointerEvent<SVGLineElement>, index: number) {
    const projection = projectOnEdge(draftPoints[index], draftPoints[(index + 1) % draftPoints.length], eventWorld(event))
    setHoveredEdge({ index, point: snapPoint(projection, event.altKey ? 0 : SNAP) })
  }

  function leaveEdge(index: number) {
    setHoveredEdge((current) => (current?.index === index ? null : current))
  }

  function insertCorner(event: ReactPointerEvent<SVGLineElement>, index: number) {
    event.stopPropagation()
    const projection = projectOnEdge(draftPoints[index], draftPoints[(index + 1) % draftPoints.length], eventWorld(event))
    const point = snapPoint(projection, event.altKey ? 0 : SNAP)
    if (
      samePoints([point], [draftPoints[index]])
      || samePoints([point], [draftPoints[(index + 1) % draftPoints.length]])
    ) return
    applyDraft({
      ...draftRef.current,
      points: [...draftPoints.slice(0, index + 1), point, ...draftPoints.slice(index + 1)],
    })
    setSelected({ kind: 'corner', index: index + 1 })
    setHoveredEdge(null)
  }

  function hoverSheet(event: ReactPointerEvent<SVGPolygonElement>) {
    if (tool !== 'holes') return
    setHoverSpot(snapPoint(eventWorld(event), SCREW_HOLE_SPACING))
  }

  function toggleHoleAt(point: Point) {
    const next = snapPoint(point, SCREW_HOLE_SPACING)
    if (!holeFits(next, draftRef.current.points)) return
    const index = draftRef.current.holes.findIndex((hole) => holeKey(hole) === holeKey(next))
    if (index >= 0) {
      applyDraft({ ...draftRef.current, holes: draftHoles.filter((_, holeIndex) => holeIndex !== index) })
      setSelected(null)
    } else {
      applyDraft({ ...draftRef.current, holes: [...draftHoles, next] })
      setSelected({ kind: 'hole', index: draftHoles.length })
    }
  }

  function deleteSelection() {
    if (!selected) return
    if (selected.kind === 'corner') {
      if (draftPoints.length <= 3) return
      applyDraft({ ...draftRef.current, points: draftPoints.filter((_, index) => index !== selected.index) })
    } else {
      applyDraft({ ...draftRef.current, holes: draftHoles.filter((_, index) => index !== selected.index) })
    }
    setSelected(null)
  }

  function nudgeSelection(delta: Point) {
    if (!selected) return
    if (selected.kind === 'corner') {
      const current = draftPoints[selected.index]
      const next = clampToView([
        snapValue(current[0] + delta[0], SNAP),
        snapValue(current[1] + delta[1], SNAP),
      ])
      applyDraft({
        ...draftRef.current,
        points: draftPoints.map((point, index) => (index === selected.index ? next : point)),
      })
    } else {
      const current = draftHoles[selected.index]
      const next = snapPoint([current[0] + delta[0], current[1] + delta[1]], SCREW_HOLE_SPACING)
      if (!holeFits(next, draftPoints)) return
      if (draftHoles.some((other, index) => index !== selected.index && holeKey(other) === holeKey(next))) return
      applyDraft({
        ...draftRef.current,
        holes: draftHoles.map((point, index) => (index === selected.index ? next : point)),
      })
    }
  }

  function commitCoordinate(kind: 'corner' | 'hole', index: number, axis: 0 | 1, raw: string) {
    const value = Number(raw)
    if (!Number.isFinite(value)) return
    if (kind === 'corner') {
      const next = [...draftPoints[index]] as Point
      next[axis] = snapValue(value, SNAP)
      const clamped = clampToView(next)
      applyDraft({
        ...draftRef.current,
        points: draftPoints.map((point, pointIndex) => (pointIndex === index ? clamped : point)),
      })
    } else {
      const next = [...draftHoles[index]] as Point
      next[axis] = snapValue(value, SCREW_HOLE_SPACING)
      if (!holeFits(next, draftPoints)) return
      if (draftHoles.some((other, otherIndex) => otherIndex !== index && holeKey(other) === holeKey(next))) return
      applyDraft({
        ...draftRef.current,
        holes: draftHoles.map((point, holeIndex) => (holeIndex === index ? next : point)),
      })
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLInputElement) return
    const mod = event.ctrlKey || event.metaKey
    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
      return
    }
    if (mod && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redo()
      return
    }
    const bigStep = event.shiftKey ? 1 : 0.25
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        deleteSelection()
        break
      case 'ArrowLeft':
        event.preventDefault()
        nudgeSelection([-bigStep, 0])
        break
      case 'ArrowRight':
        event.preventDefault()
        nudgeSelection([bigStep, 0])
        break
      case 'ArrowUp':
        event.preventDefault()
        nudgeSelection([0, bigStep])
        break
      case 'ArrowDown':
        event.preventDefault()
        nudgeSelection([0, -bigStep])
        break
    }
  }

  function commitDraft() {
    if (samePoints(draftPoints, points) && samePoints(draftHoles, holes)) return
    onChange(draftPoints, draftHoles)
  }

  function fitView() {
    setBounds(boundsFor(draftPoints, canvasSize.width || undefined, canvasSize.height || undefined))
  }

  const sx = (value: number) => value
  const sy = (value: number) => -value
  const polygonAttr = draftPoints.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')
  const fontSize = px(11)
  const { ink, muted, danger, bg } = palette

  const selectedCorner = selected?.kind === 'corner' ? selected.index : null
  const selectedHole = selected?.kind === 'hole' ? selected.index : null
  const hoverSpotFits = hoverSpot ? holeFits(hoverSpot, draftPoints) : false
  const hoverSpotTaken = hoverSpot ? placedKeys.has(holeKey(hoverSpot)) : false

  const dialogWidth = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    const aspect = Math.min(Math.max(dims.width / Math.max(dims.height, 1e-6), 0.5), 2.6)
    const targetHeight = Math.min(window.innerHeight * 0.64, 680)
    const desired = Math.round(targetHeight * aspect) + 150
    return `${Math.min(Math.max(desired, 620), Math.round(window.innerHeight * 1.9))}px`
  }, [dims.width, dims.height])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          resetSession(points, holes)
          setOpen(true)
          return
        }
        setOpen(false)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full"><SquarePen />Edit sheet</Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[94vh] flex-col gap-3 sm:max-w-[92vw]"
        style={dialogWidth ? { width: dialogWidth } : undefined}
        onKeyDown={handleKeyDown}
        onEscapeKeyDown={(event) => {
          if (selected || dragRef.current) {
            event.preventDefault()
            setSelected(null)
          }
        }}
      >
        <DialogHeader className="gap-1">
          <DialogTitle>Edit polycarbonate sheet</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the sheet outline and screw holes, then apply the changes.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={attachWrapRef}
          className="relative overflow-hidden rounded-xl border border-border"
          style={{ background: bg }}
        >
          <svg
            ref={svgRef}
            viewBox={`${bounds.minX} ${-(bounds.minY + bounds.height)} ${bounds.width} ${bounds.height}`}
            className="block h-[clamp(430px,66vh,700px)] w-full touch-none select-none"
            preserveAspectRatio="xMidYMid meet"
            aria-label="Polycarbonate outline editor"
            onPointerDown={(event) => {
              if (event.target === svgRef.current) {
                setSelected(null)
                setHoveredEdge(null)
                setHoveredCorner(null)
                setHoverSpot(null)
              }
            }}
            onPointerLeave={() => {
              setHoveredEdge(null)
              setHoveredCorner(null)
              setHoverSpot(null)
            }}
          >
            <defs>
              <pattern id="poly-hatch" width={0.28} height={0.28} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={0.28} stroke={ink} strokeOpacity={0.09} strokeWidth={px(1)} />
              </pattern>
            </defs>

            {gridLines.verticals.map(({ x, major }) => (
              <line
                key={`gx${x}`}
                x1={sx(x)}
                y1={sy(bounds.minY)}
                x2={sx(x)}
                y2={sy(bounds.minY + bounds.height)}
                stroke={ink}
                strokeOpacity={major ? 0.11 : 0.05}
                strokeWidth={px(major ? 1 : 0.75)}
                pointerEvents="none"
              />
            ))}
            {gridLines.horizontals.map(({ y, major }) => (
              <line
                key={`gy${y}`}
                x1={sx(bounds.minX)}
                y1={sy(y)}
                x2={sx(bounds.minX + bounds.width)}
                y2={sy(y)}
                stroke={ink}
                strokeOpacity={major ? 0.11 : 0.05}
                strokeWidth={px(major ? 1 : 0.75)}
                pointerEvents="none"
              />
            ))}
            <line x1={sx(bounds.minX)} y1={0} x2={sx(bounds.minX + bounds.width)} y2={0} stroke={ink} strokeOpacity={0.22} strokeWidth={px(1)} pointerEvents="none" />
            <line x1={0} y1={sy(bounds.minY)} x2={0} y2={sy(bounds.minY + bounds.height)} stroke={ink} strokeOpacity={0.22} strokeWidth={px(1)} pointerEvents="none" />

            <line
              x1={sx(dims.minX)}
              y1={sy(dims.minY) + px(16)}
              x2={sx(dims.maxX)}
              y2={sy(dims.minY) + px(16)}
              stroke={muted}
              strokeOpacity={0.7}
              strokeWidth={px(1)}
              pointerEvents="none"
            />
            <line x1={sx(dims.minX)} y1={sy(dims.minY) + px(12)} x2={sx(dims.minX)} y2={sy(dims.minY) + px(20)} stroke={muted} strokeOpacity={0.7} strokeWidth={px(1)} pointerEvents="none" />
            <line x1={sx(dims.maxX)} y1={sy(dims.minY) + px(12)} x2={sx(dims.maxX)} y2={sy(dims.minY) + px(20)} stroke={muted} strokeOpacity={0.7} strokeWidth={px(1)} pointerEvents="none" />
            <text
              x={(sx(dims.minX) + sx(dims.maxX)) / 2}
              y={sy(dims.minY) + px(31)}
              textAnchor="middle"
              fontSize={fontSize}
              fill={muted}
              className="tabular-nums"
              pointerEvents="none"
            >
              {fmt(dims.width)} in
            </text>
            <line
              x1={sx(dims.minX) - px(16)}
              y1={sy(dims.minY)}
              x2={sx(dims.minX) - px(16)}
              y2={sy(dims.maxY)}
              stroke={muted}
              strokeOpacity={0.7}
              strokeWidth={px(1)}
              pointerEvents="none"
            />
            <line x1={sx(dims.minX) - px(12)} y1={sy(dims.maxY)} x2={sx(dims.minX) - px(20)} y2={sy(dims.maxY)} stroke={muted} strokeOpacity={0.7} strokeWidth={px(1)} pointerEvents="none" />
            <line x1={sx(dims.minX) - px(12)} y1={sy(dims.minY)} x2={sx(dims.minX) - px(20)} y2={sy(dims.minY)} stroke={muted} strokeOpacity={0.7} strokeWidth={px(1)} pointerEvents="none" />
            <text
              x={sx(dims.minX) - px(27)}
              y={(sy(dims.minY) + sy(dims.maxY)) / 2}
              textAnchor="middle"
              fontSize={fontSize}
              fill={muted}
              className="tabular-nums"
              transform={`rotate(-90 ${(sx(dims.minX) - px(27))} ${(sy(dims.minY) + sy(dims.maxY)) / 2})`}
              pointerEvents="none"
            >
              {fmt(dims.height)} in
            </text>

            <polygon points={polygonAttr} fill={ink} fillOpacity={0.06} pointerEvents="none" />
            <polygon points={polygonAttr} fill="url(#poly-hatch)" stroke="none" pointerEvents="none" />
            <polygon
              points={polygonAttr}
              fill={ink}
              fillOpacity={0.01}
              pointerEvents={tool === 'holes' ? 'all' : 'none'}
              className="cursor-crosshair"
              onPointerDown={(event) => toggleHoleAt(eventWorld(event))}
              onPointerMove={hoverSheet}
            />

            {draftPoints.map(([x, y], index) => {
              const end = draftPoints[(index + 1) % draftPoints.length]
              const hovered = hoveredEdge?.index === index
              return (
                <line
                  key={`edge${index}`}
                  x1={sx(x)}
                  y1={sy(y)}
                  x2={sx(end[0])}
                  y2={sy(end[1])}
                  stroke={ink}
                  strokeOpacity={hovered ? 1 : 0.85}
                  strokeWidth={px(hovered ? 2.5 : 1.5)}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              )
            })}

            {hoveredEdge ? (
              <g pointerEvents="none">
                <circle cx={sx(hoveredEdge.point[0])} cy={sy(hoveredEdge.point[1])} r={px(HANDLE_R_PX)} fill={bg} stroke={ink} strokeWidth={px(1.5)} strokeDasharray={`${px(3)} ${px(2)}`} />
                <circle cx={sx(hoveredEdge.point[0])} cy={sy(hoveredEdge.point[1])} r={px(1.75)} fill={ink} />
              </g>
            ) : null}

            {tool === 'holes' ? candidates.map((point) => (
              placedKeys.has(holeKey(point)) ? null : (
                <circle
                  key={`c${holeKey(point)}`}
                  cx={sx(point[0])}
                  cy={sy(point[1])}
                  r={Math.max(SCREW_HOLE_DIAMETER / 4, px(2))}
                  fill={HOLE_COLOR}
                  fillOpacity={0.3}
                  pointerEvents="none"
                />
              )
            )) : null}

            {hoverSpot && !hoverSpotTaken ? (
              <circle
                cx={sx(hoverSpot[0])}
                cy={sy(hoverSpot[1])}
                r={SCREW_HOLE_DIAMETER / 2}
                fill={hoverSpotFits ? HOLE_COLOR : danger}
                fillOpacity={0.12}
                stroke={hoverSpotFits ? HOLE_COLOR : danger}
                strokeWidth={px(1.25)}
                strokeDasharray={`${px(3)} ${px(2)}`}
                pointerEvents="none"
              />
            ) : null}

            {draftHoles.map(([x, y], index) => {
              const isSelected = selectedHole === index
              return (
                <g key={`h${holeKey([x, y])}-${index}`}>
                  <circle cx={sx(x)} cy={sy(y)} r={SCREW_HOLE_DIAMETER / 2} fill={bg} stroke={isSelected ? ink : HOLE_COLOR} strokeWidth={px(isSelected ? 2.5 : 1.5)} pointerEvents="none" />
                  {isSelected ? <circle cx={sx(x)} cy={sy(y)} r={SCREW_HOLE_DIAMETER / 2 + px(4)} fill="none" stroke={ink} strokeOpacity={0.4} strokeWidth={px(1)} pointerEvents="none" /> : null}
                  <circle
                    cx={sx(x)}
                    cy={sy(y)}
                    r={Math.max(SCREW_HOLE_DIAMETER / 2, px(HOLE_HIT_R_PX))}
                    fill="#ffffff"
                    fillOpacity={0.01}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(event) => beginHoleDrag(event, index)}
                    onPointerMove={(event) => dragHole(event, index)}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    onLostPointerCapture={finishDrag}
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      applyDraft({ ...draftRef.current, holes: draftHoles.filter((_, holeIndex) => holeIndex !== index) })
                      setSelected(null)
                    }}
                  />
                </g>
              )
            })}

            {draftPoints.map(([x, y], index) => {
              const edge = draftPoints[(index + 1) % draftPoints.length]
              return (
                <line
                  key={`e${index}`}
                  x1={sx(x)}
                  y1={sy(y)}
                  x2={sx(edge[0])}
                  y2={sy(edge[1])}
                  stroke="#ffffff"
                  strokeOpacity={0.01}
                  strokeWidth={px(EDGE_HIT_PX)}
                  strokeLinecap="round"
                  className="cursor-copy"
                  onPointerMove={(event) => hoverEdge(event, index)}
                  onPointerLeave={() => leaveEdge(index)}
                  onPointerDown={(event) => insertCorner(event, index)}
                />
              )
            })}

            {draftPoints.map(([x, y], index) => {
              const isSelected = selectedCorner === index
              const isHovered = hoveredCorner === index
              return (
                <g key={`v${index}`}>
                  {isSelected ? <circle cx={sx(x)} cy={sy(y)} r={px(HANDLE_R_PX + 4.5)} fill="none" stroke={ink} strokeOpacity={0.45} strokeWidth={px(1.25)} pointerEvents="none" /> : null}
                  <circle
                    cx={sx(x)}
                    cy={sy(y)}
                    r={px(HANDLE_HIT_R_PX)}
                    fill="#ffffff"
                    fillOpacity={0.01}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(event) => beginCornerDrag(event, index)}
                    onPointerMove={(event) => dragCorner(event, index)}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    onLostPointerCapture={finishDrag}
                    onPointerEnter={() => setHoveredCorner(index)}
                    onPointerLeave={() => {
                      if (dragRef.current?.index !== index) setHoveredCorner((current) => (current === index ? null : current))
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      if (draftPoints.length > 3) {
                        applyDraft({ ...draftRef.current, points: draftPoints.filter((_, pointIndex) => pointIndex !== index) })
                        setSelected(null)
                      }
                    }}
                  />
                  <circle
                    cx={sx(x)}
                    cy={sy(y)}
                    r={px(isSelected || isHovered ? HANDLE_R_PX + 1.5 : HANDLE_R_PX)}
                    fill={isSelected || isHovered ? ink : bg}
                    stroke={ink}
                    strokeWidth={px(isSelected ? 1.75 : 1.5)}
                    pointerEvents="none"
                  />
                </g>
              )
            })}
          </svg>

          <div className="absolute left-2 top-2 flex items-center gap-0.5 rounded-lg border border-border bg-popover/90 p-0.5 backdrop-blur-sm">
            {(['outline', 'holes'] as Tool[]).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  setTool(entry)
                  setSelected(null)
                  setHoveredEdge(null)
                  setHoveredCorner(null)
                  setHoverSpot(null)
                }}
                className={cn(
                  '[&_svg]:size-3.5 flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                  tool === entry
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {entry === 'outline' ? <MousePointer2 /> : <Circle />}
                {entry === 'outline' ? 'Outline' : 'Holes'}
              </button>
            ))}
          </div>

          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-lg border border-border bg-popover/90 p-0.5 backdrop-blur-sm">
            <Button variant="ghost" size="icon-xs" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={past.length === 0} onClick={undo}>
              <Undo2 />
            </Button>
            <Button variant="ghost" size="icon-xs" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={future.length === 0} onClick={redo}>
              <Redo2 />
            </Button>
            <Button variant="ghost" size="icon-xs" title="Fit view" aria-label="Fit view" onClick={fitView}>
              <Maximize2 />
            </Button>
          </div>

          <p className="pointer-events-none absolute bottom-1.5 left-2 rounded bg-popover/80 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
            {tool === 'outline'
              ? 'Click edge: add corner · Drag corner: move · Alt: free placement · Del: remove · Ctrl+Z: undo'
              : 'Click inside sheet: drill hole · Drag: move · Del: remove · Ctrl+Z: undo'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={footprintOk ? 'neutral' : 'bad'} title={`Competition sheets must fit ${MAX_FOOTPRINT_SHORT}×${MAX_FOOTPRINT_LONG} in`}>
              {footprintOk ? <Check className="size-3" /> : <TriangleAlert className="size-3" />}
              {fmt(dims.width)} × {fmt(dims.height)} in
            </Chip>
            <Chip>{area.toFixed(2)} in²</Chip>
            <Chip>{draftPoints.length} corners</Chip>
            <Chip>{draftHoles.length} holes</Chip>
          </div>

          {selected ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1">
              <span className="font-medium">{selected.kind === 'corner' ? `Corner ${selected.index + 1}` : `Hole ${selected.index + 1}`}</span>
              {([0, 1] as const).map((axis) => {
                const value = (selected.kind === 'corner' ? draftPoints[selected.index] : draftHoles[selected.index])?.[axis]
                if (value == null) return null
                return (
                  <label key={axis} className="flex items-center gap-1 text-muted-foreground">
                    {axis === 0 ? 'X' : 'Y'}
                    <Input
                      className="h-6 w-14 px-1.5 tabular-nums"
                      defaultValue={fmt(value)}
                      key={`${selected.kind}-${selected.index}-${axis}-${fmt(value)}`}
                      onBlur={(event) => commitCoordinate(selected.kind, selected.index, axis, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                      }}
                    />
                  </label>
                )
              })}
              <span className="text-muted-foreground">Arrows nudge</span>
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-1">
            {tool === 'outline' ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const rect = rectanglePolygon(fallbackWidth, fallbackHeight)
                    applyDraft({ ...draftRef.current, points: rect })
                    setBounds(boundsFor(rect, canvasSize.width || undefined, canvasSize.height || undefined))
                    setSelected(null)
                  }}
                >
                  <RotateCcw />Reset
                </Button>
                <Button variant="ghost" size="sm" disabled={selectedCorner == null || draftPoints.length <= 3} onClick={deleteSelection}>
                  <Trash2 />Delete corner
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={draftHoles.length === 0}
                  onClick={() => {
                    applyDraft({ ...draftRef.current, holes: [] })
                    setSelected(null)
                  }}
                >
                  <RotateCcw />Clear holes
                </Button>
                <Button variant="ghost" size="sm" disabled={selectedHole == null} onClick={deleteSelection}>
                  <Trash2 />Delete hole
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" disabled={!dirty} onClick={() => {
            commitDraft()
            setOpen(false)
          }}>
            Apply changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
