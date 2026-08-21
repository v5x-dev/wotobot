import { Input } from '@/components/ui/input'
import type { PlacedPart } from './parts'

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
    <label className="grid grid-cols-[1rem_1fr] items-center gap-1">
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
  onChange,
}: {
  part: PlacedPart | null
  onChange: (position: [number, number, number], rotation: [number, number, number]) => void
}) {
  if (!part) {
    return (
      <div className="pointer-events-none absolute bottom-8 left-3 z-20 h-fit w-fit rounded-md border border-sidebar-border bg-sidebar/90 px-3 py-2 text-xs text-muted-foreground">
        No selection
      </div>
    )
  }

  const [x, y, z] = part.position
  const [rx, ry, rz] = part.rotation
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const toDeg = (radians: number) => (radians * 180) / Math.PI

  return (
    <div className="pointer-events-auto absolute bottom-8 left-3 z-20 h-fit w-44 rounded-md border border-sidebar-border bg-sidebar/90 p-3 text-xs">
      <p className="mb-2 font-medium">Current selection</p>
      <div className="grid gap-1">
        <Field label="X" value={x} onCommit={(value) => onChange([value, y, z], part.rotation)} />
        <Field label="Y" value={y} onCommit={(value) => onChange([x, value, z], part.rotation)} />
        <Field label="Z" value={z} onCommit={(value) => onChange([x, y, value], part.rotation)} />
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
  )
}
