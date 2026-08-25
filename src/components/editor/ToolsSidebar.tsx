import {
  Box,
  CircleDotDashed,
  Copy,
  Group,
  Link2,
  MousePointer2,
  Palette,
  Scan,
  Square,
  Trash2,
  Ungroup,
  Unlink2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { COLOR_PRESETS, hexToRgb, rgbToHex } from '@/model/colors'
import type { EditorTool } from '@/editor/useRobotEditor'
import { formatHotkey, type Hotkeys } from '@/hotkeys'

const TOOLS: { id: EditorTool; label: string; action: keyof Hotkeys; icon: typeof MousePointer2 }[] = [
  { id: 'transform', label: 'Transform', action: 'transformTool', icon: MousePointer2 },
  { id: 'color', label: 'Color', action: 'colorTool', icon: Palette },
]

function ToolButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex">
          <Button aria-label={label} {...props}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  )
}

export function ToolsSidebar({
  tool,
  onTool,
  hasSelection,
  canDelete,
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
  hotkeys,
}: {
  tool: EditorTool
  onTool: (tool: EditorTool) => void
  hasSelection: boolean
  canDelete: boolean
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
  hotkeys: Hotkeys
}) {
  return (
    <div data-tutorial="tools-sidebar" className="pointer-events-auto absolute top-3 left-3 z-20 flex h-fit w-fit flex-col gap-1 rounded-lg border border-sidebar-border bg-sidebar p-1 shadow-sm">
      {TOOLS.map((item) => (
        <ToolButton
          key={item.id}
          label={`${item.label} (${formatHotkey(hotkeys[item.action])})`}
          variant={tool === item.id ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={() => onTool(item.id)}
        >
          <item.icon />
        </ToolButton>
      ))}
      <div className="mx-1 my-0.5 h-px bg-sidebar-border" />
      <ToolButton
        label={chainActionReason}
        variant={chainAction === 'remove' ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-label={chainAction === 'remove' ? 'Remove chain' : 'Add chain'}
        disabled={chainAction == null}
        onClick={onToggleChain}
      >
        {chainAction === 'remove' ? <Unlink2 /> : <Link2 />}
      </ToolButton>
      <div className="mx-1 my-0.5 h-px bg-sidebar-border" />
      <ToolButton
        label={`Duplicate (${formatHotkey(hotkeys.duplicate)})`}
        variant="ghost"
        size="icon-sm"
        disabled={!hasSelection}
        onClick={onDuplicate}
      >
        <Copy />
      </ToolButton>
      <ToolButton
        label={`Delete (${formatHotkey(hotkeys.delete)})`}
        variant="ghost"
        size="icon-sm"
        disabled={!canDelete}
        onClick={onDelete}
      >
        <Trash2 />
      </ToolButton>
      <ToolButton
        label={`Focus selection (${formatHotkey(hotkeys.focus)})`}
        variant="ghost"
        size="icon-sm"
        disabled={!hasSelection}
        onClick={onFocus}
      >
        <Scan />
      </ToolButton>
      <div className="mx-1 my-0.5 h-px bg-sidebar-border" />
      <ToolButton
        label={`Group selection (${formatHotkey(hotkeys.group)})`}
        variant="ghost"
        size="icon-sm"
        disabled={!canGroup}
        onClick={onGroup}
      >
        <Group />
      </ToolButton>
      <ToolButton
        label={`Ungroup selection (${formatHotkey(hotkeys.ungroup)})`}
        variant="ghost"
        size="icon-sm"
        disabled={!canUngroup}
        onClick={onUngroup}
      >
        <Ungroup />
      </ToolButton>
      <div className="mx-1 my-0.5 h-px bg-sidebar-border" />
      <ToolButton
        label={`${showHoles ? 'Hide' : 'Show'} all holes (${formatHotkey(hotkeys.toggleHoles)})`}
        variant={showHoles ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-pressed={showHoles}
        onClick={onToggleHoles}
      >
        <CircleDotDashed />
      </ToolButton>
      <ToolButton
        label={`Use ${ortho ? 'perspective' : 'orthographic'} view (${formatHotkey(hotkeys.toggleProjection)})`}
        variant={ortho ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-pressed={ortho}
        onClick={onToggleProjection}
      >
        {ortho ? <Square /> : <Box />}
      </ToolButton>
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
          <Tooltip key={preset.name}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Set color to ${preset.name}`}
                className="size-5 rounded-sm border border-black/20"
                style={{ background: rgbToHex(preset.rgb) }}
                onClick={() => onChange(preset.name === 'Default' ? null : preset.rgb)}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>{preset.name}</TooltipContent>
          </Tooltip>
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
