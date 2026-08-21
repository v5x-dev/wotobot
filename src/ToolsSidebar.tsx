import { CircleDotDashed, Copy, Move3d, MousePointer2, Palette, Scan, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COLOR_PRESETS, hexToRgb, rgbToHex } from './colors'
import type { EditorTool } from './useRobotEditor'

const TOOLS: { id: EditorTool; label: string; shortcut: string; icon: typeof MousePointer2 }[] = [
  { id: 'transform', label: 'Transform', shortcut: '1', icon: MousePointer2 },
  { id: 'move', label: 'Move', shortcut: '2', icon: Move3d },
  { id: 'color', label: 'Color', shortcut: '3', icon: Palette },
]

export function ToolsSidebar({
  tool,
  onTool,
  hasSelection,
  onDuplicate,
  onDelete,
  onFocus,
  showHoles,
  onToggleHoles,
}: {
  tool: EditorTool
  onTool: (tool: EditorTool) => void
  hasSelection: boolean
  onDuplicate: () => void
  onDelete: () => void
  onFocus: () => void
  showHoles: boolean
  onToggleHoles: () => void
}) {
  return (
    <div className="pointer-events-auto absolute top-3 left-3 z-20 flex h-fit w-fit flex-col gap-1 rounded-lg border border-sidebar-border bg-sidebar p-1 shadow-sm">
      {TOOLS.map((item) => (
        <Button
          key={item.id}
          variant={tool === item.id ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-label={`${item.label} (${item.shortcut})`}
          title={`${item.label} (${item.shortcut})`}
          onClick={() => onTool(item.id)}
        >
          <item.icon />
        </Button>
      ))}
      <div className="mx-1 my-0.5 h-px bg-sidebar-border" />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Duplicate"
        title="Duplicate (Ctrl+D)"
        disabled={!hasSelection}
        onClick={onDuplicate}
      >
        <Copy />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete"
        title="Delete"
        disabled={!hasSelection}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Focus"
        title="Focus (F)"
        disabled={!hasSelection}
        onClick={onFocus}
      >
        <Scan />
      </Button>
      <div className="mx-1 my-0.5 h-px bg-sidebar-border" />
      <Button
        variant={showHoles ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-label="Show all holes"
        aria-pressed={showHoles}
        title="Show all holes (H)"
        onClick={onToggleHoles}
      >
        <CircleDotDashed />
      </Button>
    </div>
  )
}

export function ColorSwatches({
  color,
  onChange,
}: {
  color: [number, number, number] | null
  onChange: (color: [number, number, number] | null) => void
}) {
  return (
    <div className="pointer-events-auto absolute top-3 left-16 z-20 h-fit w-52 rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-sm">
      <p className="mb-2 text-xs font-medium">Color</p>
      <div className="grid grid-cols-7 gap-1">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            title={preset.name}
            className="size-5 rounded-sm border border-black/20"
            style={{ background: rgbToHex(preset.rgb) }}
            onClick={() => onChange(preset.name === 'Default' ? null : preset.rgb)}
          />
        ))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs">
        Custom
        <input
          type="color"
          value={rgbToHex(color ?? [0.949, 0.949, 0.949])}
          onChange={(event) => onChange(hexToRgb(event.target.value))}
          className="h-6 w-full cursor-pointer bg-transparent"
        />
      </label>
    </div>
  )
}
