import {
  Box,
  CircleDotDashed,
  Copy,
  Group,
  Link2,
  Move3d,
  MousePointer2,
  Palette,
  Scan,
  Square,
  Trash2,
  Ungroup,
  Unlink2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COLOR_PRESETS, hexToRgb, rgbToHex } from '@/model/colors'
import type { EditorTool } from '@/editor/useRobotEditor'

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
  ortho,
  onToggleProjection,
  canGroup,
  onGroup,
  canUngroup,
  onUngroup,
  chainAction,
  chainActionReason,
  onToggleChain,
}: {
  tool: EditorTool
  onTool: (tool: EditorTool) => void
  hasSelection: boolean
  onDuplicate: () => void
  onDelete: () => void
  onFocus: () => void
  showHoles: boolean
  onToggleHoles: () => void
  ortho: boolean
  onToggleProjection: () => void
  canGroup: boolean
  onGroup: () => void
  canUngroup: boolean
  onUngroup: () => void
  chainAction: 'add' | 'remove' | null
  chainActionReason: string
  onToggleChain: () => void
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
        variant={chainAction === 'remove' ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-label={chainAction === 'remove' ? 'Remove chain' : 'Add chain'}
        title={chainActionReason}
        disabled={chainAction == null}
        onClick={onToggleChain}
      >
        {chainAction === 'remove' ? <Unlink2 /> : <Link2 />}
      </Button>
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
        variant="ghost"
        size="icon-sm"
        aria-label="Group"
        title="Group (Ctrl+G)"
        disabled={!canGroup}
        onClick={onGroup}
      >
        <Group />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Ungroup"
        title="Ungroup (Ctrl+Shift+G)"
        disabled={!canUngroup}
        onClick={onUngroup}
      >
        <Ungroup />
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
      <Button
        variant={ortho ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-label={ortho ? 'Use perspective projection' : 'Use orthographic projection'}
        aria-pressed={ortho}
        title={`${ortho ? 'Perspective' : 'Orthographic'} (O)`}
        onClick={onToggleProjection}
      >
        {ortho ? <Square /> : <Box />}
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
