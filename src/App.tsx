import { Canvas, useThree } from '@react-three/fiber'
import { GizmoHelper, GizmoViewport } from '@react-three/drei'
import { CircleHelp, File, Maximize2, Minimize2, Pencil } from 'lucide-react'
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { MOUSE, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { AddSidebar } from '@/components/editor/AddSidebar'
import { HotkeyDialog } from '@/components/editor/HotkeyDialog'
import { PropertiesPanel } from '@/components/editor/PropertiesPanel'
import { ColorSwatches, ToolsSidebar } from '@/components/editor/ToolsSidebar'
import { PolycarbonateBadge } from '@/components/editor/PolycarbonateBadge'
import { ChainBadge } from '@/components/editor/ChainBadge'
import { WeightBadge } from '@/components/editor/WeightBadge'
import { BoxSelect } from '@/components/scene/BoxSelect'
import { FpsCounter } from '@/components/scene/FpsCounter'
import { InfiniteGrid } from '@/components/scene/InfiniteGrid'
import { OrbitControls } from '@/components/scene/OrbitControls'
import { PlacementPreview } from '@/components/scene/PlacementPreview'
import { SceneParts } from '@/components/scene/SceneParts'
import { SprocketChains } from '@/components/scene/SprocketChains'
import { useRobotEditor } from '@/editor/useRobotEditor'
import { AXIS_COLORS } from '@/model/colors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { formatHotkey, matchesHotkey, useHotkeys } from '@/hotkeys'

const DOCS_URL = 'https://protobot.web.app/'
const CAMERA_POSITION: [number, number, number] = [5, 4, 5]

function TopMenu({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-40">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FocusCamera({ point, token }: { point: [number, number, number] | null; token: number }) {
  const controls = useThree((state) => state.controls) as unknown as { target: Vector3 } | undefined
  useEffect(() => {
    if (!point || !controls || token === 0) return
    controls.target.set(...point)
  }, [controls, point, token])
  return null
}

function CameraProjection({ ortho }: { ortho: boolean }) {
  const get = useThree((state) => state.get)
  const set = useThree((state) => state.set)
  const size = useThree((state) => state.size)
  const perspRef = useRef<PerspectiveCamera | null>(null)
  const orthoRef = useRef<OrthographicCamera | null>(null)
  const orthoHalfHeightRef = useRef(20)

  useLayoutEffect(() => {
    const { camera } = get()
    if (camera instanceof PerspectiveCamera) perspRef.current = camera
    const persp = perspRef.current
    if (!persp) return

    if (ortho) {
      const aspect = size.width / Math.max(size.height, 1)
      if (camera instanceof PerspectiveCamera) {
        const controls = get().controls as unknown as { target?: Vector3 } | undefined
        const target = controls?.target ?? new Vector3()
        const distance = camera.position.distanceTo(target)
        orthoHalfHeightRef.current = distance * Math.tan((camera.fov * Math.PI) / 360)
      }
      const halfH = orthoHalfHeightRef.current
      const halfW = halfH * aspect
      let next = orthoRef.current
      if (!next) {
        next = new OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.3, 1000)
        orthoRef.current = next
      } else {
        next.left = -halfW
        next.right = halfW
        next.top = halfH
        next.bottom = -halfH
      }
      if (camera instanceof PerspectiveCamera) next.zoom = 1
      next.updateProjectionMatrix()
      next.position.copy(camera.position)
      next.quaternion.copy(camera.quaternion)
      next.up.copy(camera.up)
      if (camera !== next) set({ camera: next })
      return
    }

    if (camera !== persp) {
      const controls = get().controls as unknown as { target?: Vector3 } | undefined
      const target = controls?.target ?? new Vector3()
      const direction = camera.position.clone().sub(target)
      const halfHeight = orthoHalfHeightRef.current / Math.max(camera.zoom, 0.0001)
      const distance = halfHeight / Math.tan((persp.fov * Math.PI) / 360)
      if (direction.lengthSq() > 0) direction.setLength(distance)
      persp.position.copy(camera.position)
      if (direction.lengthSq() > 0) persp.position.copy(target).add(direction)
      persp.quaternion.copy(camera.quaternion)
      persp.up.copy(camera.up)
      persp.updateProjectionMatrix()
      set({ camera: persp })
    }
  }, [get, ortho, set, size.height, size.width])

  return null
}

function App() {
  const { hotkeys, setHotkey, resetHotkeys } = useHotkeys()
  const editor = useRobotEditor(hotkeys)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [hotkeysOpen, setHotkeysOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [focusToken, setFocusToken] = useState(0)
  const fpsLabel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!matchesHotkey(event, hotkeys.focus)) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (!editor.primary) return
      event.preventDefault()
      setFocusToken((value) => value + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor.primary, hotkeys.focus])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen()
    }
  }

  function boxSelect(ids: number[]) {
    ids.forEach((id, index) => editor.selectPart(id, index > 0))
  }

  return (
    <TooltipProvider>
      <div className="flex h-svh flex-col overflow-hidden">
        <header className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-0.5 px-2">
            <TopMenu icon={<File />} label="File">
              <DropdownMenuItem onSelect={() => editor.newFile()}>
                New
                <DropdownMenuShortcut>{formatHotkey(hotkeys.newFile)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void editor.openFile()}>
                Open
                <DropdownMenuShortcut>{formatHotkey(hotkeys.openFile)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void editor.saveFile()}>
                Save
                <DropdownMenuShortcut>{formatHotkey(hotkeys.saveFile)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void editor.saveFileAs()}>
                Save As...
                <DropdownMenuShortcut>{formatHotkey(hotkeys.saveFileAs)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void editor.exportParts()}>
                Export
              </DropdownMenuItem>
            </TopMenu>
            <TopMenu icon={<Pencil />} label="Edit">
              <DropdownMenuItem disabled={!editor.canUndo} onSelect={() => editor.undo()}>
                Undo
                <DropdownMenuShortcut>{formatHotkey(hotkeys.undo)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.canRedo} onSelect={() => editor.redo()}>
                Redo
                <DropdownMenuShortcut>{formatHotkey(hotkeys.redo)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!editor.hasSelection} onSelect={() => editor.cut()}>
                Cut
                <DropdownMenuShortcut>{formatHotkey(hotkeys.cut)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.hasSelection} onSelect={() => editor.copy()}>
                Copy
                <DropdownMenuShortcut>{formatHotkey(hotkeys.copy)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.canPaste} onSelect={() => editor.paste()}>
                Paste
                <DropdownMenuShortcut>{formatHotkey(hotkeys.paste)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.hasSelection} onSelect={() => editor.duplicate()}>
                Duplicate
                <DropdownMenuShortcut>{formatHotkey(hotkeys.duplicate)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.selectAll()}>
                Select All
                <DropdownMenuShortcut>{formatHotkey(hotkeys.selectAll)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.canGroup} onSelect={() => editor.groupSelected()}>
                Group
                <DropdownMenuShortcut>{formatHotkey(hotkeys.group)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!editor.canUngroup}
                onSelect={() => editor.ungroupSelected()}
              >
                Ungroup
                <DropdownMenuShortcut>{formatHotkey(hotkeys.ungroup)}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!editor.canDelete}
                onSelect={() => editor.deleteSelected()}
              >
                Delete
                <DropdownMenuShortcut>{formatHotkey(hotkeys.delete)}</DropdownMenuShortcut>
              </DropdownMenuItem>
            </TopMenu>
            <TopMenu icon={<CircleHelp />} label="Help">
              <DropdownMenuItem onSelect={() => setHotkeysOpen(true)}>
                Keyboard shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => window.open(DOCS_URL, '_blank', 'noopener,noreferrer')}
              >
                Documentation
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAboutOpen(true)}>About</DropdownMenuItem>
            </TopMenu>
          </div>
          {renaming ? (
            <Input
              autoFocus
              className="h-7 w-56 text-center text-sm"
              defaultValue={editor.fileName}
              onBlur={(event) => {
                editor.renameFile(event.target.value)
                setRenaming(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  editor.renameFile(event.currentTarget.value)
                  setRenaming(false)
                }
                if (event.key === 'Escape') setRenaming(false)
              }}
            />
          ) : (
            <button
              type="button"
              className="truncate px-3 text-sm text-muted-foreground"
              onClick={() => setRenaming(true)}
            >
              {editor.fileName}
              {editor.dirty ? '*' : ''}
            </button>
          )}
          <div className="flex items-center justify-end px-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </div>
        </header>
        <SidebarProvider defaultOpen={false} className="relative min-h-0 flex-1 overflow-hidden">
          <SidebarInset className="relative h-full min-h-0 min-w-0 overflow-hidden p-0">
            <div data-slot="scene-hud">
              <ToolsSidebar
                tool={editor.tool}
                onTool={editor.setTool}
                hasSelection={editor.hasSelection}
                canDelete={editor.canDelete}
                onDuplicate={editor.duplicate}
                onDelete={editor.deleteSelected}
                onFocus={() => setFocusToken((value) => value + 1)}
                showHoles={editor.showHoles}
                onToggleHoles={editor.toggleHoles}
                ortho={editor.ortho}
                onToggleProjection={() => editor.setOrtho(!editor.ortho)}
                canGroup={editor.canGroup}
                onGroup={editor.groupSelected}
                canUngroup={editor.canUngroup}
                onUngroup={editor.ungroupSelected}
                chainAction={editor.selectedChainAction.mode}
                chainActionReason={editor.selectedChainAction.reason}
                onToggleChain={editor.toggleSelectedChain}
                hotkeys={hotkeys}
              />
              {editor.tool === 'color' ? (
                <ColorSwatches
                  color={editor.color}
                  onChange={(next) => {
                    editor.setColor(next)
                    editor.paintSelected(next)
                  }}
                />
              ) : null}
              <PropertiesPanel
                part={editor.primary}
                parts={editor.parts}
                onChange={(position, rotation) => {
                  if (editor.primaryId == null) return
                  editor.transformPart(editor.primaryId, position, rotation)
                }}
                onShapeChange={(shape, width, height) => {
                  if (editor.primaryId == null) return
                  editor.updatePartShape(editor.primaryId, shape, width, height)
                }}
              />
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
                <WeightBadge parts={editor.parts} />
                <PolycarbonateBadge parts={editor.parts} />
                {editor.selectedChainId != null ? (
                  <ChainBadge linkCount={editor.selectedChainLinkCount} />
                ) : null}
              </div>
              <div
                ref={fpsLabel}
                className="absolute top-36 right-3 select-none font-mono text-xs tabular-nums text-white/70"
              >
                0 FPS
              </div>
            </div>
            <Canvas
              data-slot="scene"
              className={`h-full w-full bg-background${editor.placingPart ? ' cursor-crosshair' : ''}`}
              camera={{ position: CAMERA_POSITION, fov: 50, near: 0.3, far: 2000 }}
              frameloop="always"
              gl={{ alpha: true, stencil: true }}
              onPointerMissed={editor.onPointerMissed}
              onContextMenu={(event) => event.preventDefault()}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[8, 12, 6]} intensity={0.8} />
              <CameraProjection ortho={editor.ortho} />
              {editor.showGrid ? <InfiniteGrid /> : null}
              <SprocketChains
                parts={editor.parts}
                chains={editor.chains}
                selectedChainId={editor.selectedChainId}
                interactive={editor.placingPart == null}
                onSelect={editor.selectChain}
              />
              <SceneParts
                parts={editor.parts}
                chains={editor.chains}
                selectedIds={editor.selectedIds}
                primaryId={editor.primaryId}
                connectedIds={editor.connectedIds}
                interactive={!editor.placingPart && editor.tool !== 'move'}
                showHoles={editor.showHoles}
                detectHoles={editor.placingPart != null}
                showGizmos={editor.tool === 'transform'}
                onSelect={editor.selectPart}
                onTransform={editor.transformPart}
                onTransformLive={editor.previewPartTransform}
                onMoveStart={editor.onMoveStart}
                onMoveEnd={editor.onMoveEnd}
              />
              <Suspense>
                <PlacementPreview
                  part={
                    editor.placingPart
                      ? {
                          instanceId: -1,
                          ...editor.placingPart,
                          position: [0, 0, 0],
                          color: null,
                        }
                      : null
                  }
                  parts={editor.parts}
                  flip={editor.flipHole}
                  rotating={editor.rotatingPlacement}
                  debugHoles={editor.showHoles}
                  onPlace={editor.placeAt}
                  onRotation={editor.updatePlacingRotation}
                />
              </Suspense>
              <OrbitControls
                makeDefault
                target={[0, 0, 0]}
                minDistance={0.5}
                maxDistance={1000}
                mouseButtons={{ LEFT: undefined, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.ROTATE }}
              />
              <GizmoHelper alignment="top-right" margin={[76, 76]}>
                <GizmoViewport
                  axisColors={AXIS_COLORS}
                  labels={['', '', '']}
                  axisHeadScale={0.9}
                />
              </GizmoHelper>
              <FocusCamera point={editor.primary?.position ?? null} token={focusToken} />
              <BoxSelect
                enabled={!editor.placingPart}
                parts={editor.parts}
                onSelect={boxSelect}
                hotkey={hotkeys.boxSelect}
              />
              <FpsCounter target={fpsLabel} />
            </Canvas>
          </SidebarInset>
          <AddSidebar
            placing={editor.placingPart != null}
            onStartPlacing={editor.startPlacing}
            onUpdatePlacing={editor.updatePlacing}
            onStopPlacing={editor.stopPlacing}
          />
        </SidebarProvider>
        <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Protobot</DialogTitle>
              <DialogDescription>
                A browser CAD for prototyping VEX-style robots. Designs save as .wbb files.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <HotkeyDialog
          open={hotkeysOpen}
          onOpenChange={setHotkeysOpen}
          hotkeys={hotkeys}
          onChange={setHotkey}
          onReset={resetHotkeys}
        />
      </div>
    </TooltipProvider>
  )
}

export default App
