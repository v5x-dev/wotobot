import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { findPart, type PlacedPart, type PolycarbonateShape, polygonSize, rectanglePolygon } from '@/model/parts'
import {
  DEFAULT_THICKNESS,
  evaluatePolycarbonate,
  pieceLimitReasons,
  polycarbonateBudgetReasons,
  polycarbonatePieceStatus,
} from '@/model/polycarbonateLimits'
import { PolycarbonateShapeEditor } from './PolycarbonateShapeEditor'

function Field({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (value: number) => void
}) {
  return (
    <label className="grid gap-0.5">
      <span className="text-muted-foreground">{label}</span>
      <Input
        className="h-6 px-1.5 text-xs tabular-nums"
        defaultValue={value.toFixed(3)}
        key={value.toFixed(3)}
        onBlur={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onCommit(next)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
    </label>
  )
}

export function PropertiesPanel({
  part,
  parts,
  onChange,
  onVariantChange,
  onReplace,
  onShapeChange,
  triangleCount,
}: {
  part: PlacedPart | null
  parts: PlacedPart[]
  onChange: (position: [number, number, number], rotation: [number, number, number]) => void
  onVariantChange: (param1: string, param2: string) => void
  onReplace: () => void
  onShapeChange: (shape: PolycarbonateShape, width: string, height: string) => void
  triangleCount: number | null
}) {
  if (!part) return null

  const [x, y, z] = part.position
  const [rx, ry, rz] = part.rotation
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const toDeg = (radians: number) => (radians * 180) / Math.PI
  const definition = findPart(part.key)
  const isPolycarbonate = definition?.generator === 'polycarbonate'
  const isCylinder = definition?.id === 'PNMT'
  const polyStatus = isPolycarbonate ? evaluatePolycarbonate(parts) : null
  const robotReasons = polyStatus?.over ? polycarbonateBudgetReasons(polyStatus) : []
  const name = part.onshapeName ?? findPart(part.key)?.name ?? part.key

  return (
    <div data-tutorial="properties-panel" className={`pointer-events-auto absolute bottom-8 left-3 z-20 h-fit rounded-md border border-sidebar-border bg-sidebar/90 p-3 text-xs ${isPolycarbonate ? 'w-64' : 'w-56'}`}>
      <p className="mb-2 font-medium">Current selection</p>
      <div className="mb-2 min-w-0 rounded border border-sidebar-border bg-background/50 px-2 py-1.5">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{part.onshapeName ? 'Onshape name' : 'Part'}</div>
        <div className="break-words font-medium" title={name}>{name}</div>
        <div className="text-[10px] tabular-nums text-muted-foreground">
          {triangleCount == null
            ? 'Counting triangles...'
            : `${triangleCount.toLocaleString()} ${triangleCount === 1 ? 'triangle' : 'triangles'}`}
        </div>
      </div>
      <div className="grid gap-1.5">
        <div className="grid grid-cols-3 gap-1">
          <Field label="X" value={x} onCommit={(value) => onChange([value, y, z], part.rotation)} />
          <Field label="Y" value={y} onCommit={(value) => onChange([x, value, z], part.rotation)} />
          <Field label="Z" value={z} onCommit={(value) => onChange([x, y, value], part.rotation)} />
        </div>
        <div className="grid grid-cols-3 gap-1">
          <Field
            label="RX"
            value={toDeg(rx)}
            onCommit={(value) => onChange(part.position, [toRad(value), ry, rz])}
          />
          <Field
            label="RY"
            value={toDeg(ry)}
            onCommit={(value) => onChange(part.position, [rx, toRad(value), rz])}
          />
          <Field
            label="RZ"
            value={toDeg(rz)}
            onCommit={(value) => onChange(part.position, [rx, ry, toRad(value)])}
          />
        </div>
      </div>
      <Button className="mt-3 w-full" size="sm" variant="outline" onClick={onReplace}>
        Replace part
      </Button>
      {isCylinder ? (
        <div className="mt-3 grid gap-1.5 border-t border-sidebar-border pt-3">
          <p className="font-medium">Cylinder position</p>
          <div className="grid grid-cols-2 gap-1">
            <Button
              size="sm"
              variant={part.param2 === 'Normal' ? 'secondary' : 'outline'}
              aria-pressed={part.param2 === 'Normal'}
              onClick={() => onVariantChange(part.param1, 'Normal')}
            >
              Retracted
            </Button>
            <Button
              size="sm"
              variant={part.param2 === 'Extended' ? 'secondary' : 'outline'}
              aria-pressed={part.param2 === 'Extended'}
              onClick={() => onVariantChange(part.param1, 'Extended')}
            >
              Extended
            </Button>
          </div>
        </div>
      ) : null}
      {isPolycarbonate ? (
        <PolycarbonateEditor
          key={`${part.instanceId}:${JSON.stringify(part.shape)}`}
          part={part}
          robotReasons={robotReasons}
          onChange={onShapeChange}
        />
      ) : null}
    </div>
  )
}

function PolycarbonateEditor({
  part,
  robotReasons,
  onChange,
}: {
  part: PlacedPart
  robotReasons: string[]
  onChange: (shape: PolycarbonateShape, width: string, height: string) => void
}) {
  const initialWidth = Number(part.param1) || 4
  const initialHeight = Number(part.param2) || 8
  const points = part.shape?.points ?? rectanglePolygon(initialWidth, initialHeight)
  const holes = part.shape?.holes ?? []
  const draft = polycarbonatePieceStatus(part)
  const limitReasons = draft ? pieceLimitReasons(draft) : []

  function commit(nextPoints: [number, number][], nextHoles: [number, number][]) {
    if (nextPoints.length < 3) return
    const { width, height } = polygonSize(nextPoints)
    if (width <= 0 || height <= 0) return
    onChange({
      kind: 'polygon',
      thickness: DEFAULT_THICKNESS,
      points: nextPoints,
      holes: nextHoles,
    }, String(width), String(height))
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-sidebar-border pt-3">
      <p className="font-medium">Sheet shape</p>
      <PolycarbonateShapeEditor
        points={points}
        holes={holes}
        fallbackWidth={initialWidth}
        fallbackHeight={initialHeight}
        onChange={commit}
      />
      {robotReasons.map((reason) => (
        <p key={`robot-${reason}`} className="text-destructive">{reason}</p>
      ))}
      {limitReasons.map((reason) => (
        <p key={reason} className="text-destructive">{reason}</p>
      ))}
    </div>
  )
}
