import { Canvas, useThree } from '@react-three/fiber'
import { CircleHelp, File, Maximize2, Minimize2, Pencil } from 'lucide-react'
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { MOUSE, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { AddSidebar } from '@/components/editor/AddSidebar'
import { PropertiesPanel } from '@/components/editor/PropertiesPanel'
import { ColorSwatches, ToolsSidebar } from '@/components/editor/ToolsSidebar'
import { PolycarbonateBadge } from '@/components/editor/PolycarbonateBadge'
import { WeightBadge } from '@/components/editor/WeightBadge'
import { BoxSelect } from '@/components/scene/BoxSelect'
import { FpsCounter } from '@/components/scene/FpsCounter'
import { InfiniteGrid } from '@/components/scene/InfiniteGrid'
import { OrbitControls } from '@/components/scene/OrbitControls'
import { PlacementPreview } from '@/components/scene/PlacementPreview'
import { SceneParts } from '@/components/scene/SceneParts'
import { useRobotEditor } from '@/editor/useRobotEditor'
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

const IS_APPLE = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
const DOCS_URL = 'https://protobot.web.app/'
const CAMERA_POSITION: [number, number, number] = [16, 12, 16]

function shortcut(key: string) {
  return IS_APPLE ? `⌘${key}` : `Ctrl+${key}`
}

function shiftShortcut(key: string) {
  return IS_APPLE ? `⇧⌘${key}` : `Ctrl+Shift+${key}`
}

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

  useLayoutEffect(() => {
    const { camera } = get()
    if (camera instanceof PerspectiveCamera) perspRef.current = camera
    const persp = perspRef.current
    if (!persp) return

    if (ortho) {
      const aspect = size.width / Math.max(size.height, 1)
      const halfH = 20
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
        next.updateProjectionMatrix()
      }
      next.position.copy(camera.position)
      next.quaternion.copy(camera.quaternion)
      next.up.copy(camera.up)
      if (camera !== next) set({ camera: next })
      return
    }

    if (camera !== persp) {
      persp.position.copy(camera.position)
      persp.quaternion.copy(camera.quaternion)
      persp.up.copy(camera.up)
      persp.updateProjectionMatrix()
      set({ camera: persp })
    }
  }, [get, ortho, set, size.height, size.width])

  return null
}

function App() {
  const editor = useRobotEditor()
  const [aboutOpen, setAboutOpen] = useState(false)
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
      if (event.key.toLowerCase() !== 'f' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (!editor.primary) return
      event.preventDefault()
      setFocusToken((value) => value + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor.primary])

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
                <DropdownMenuShortcut>{shortcut('N')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void editor.openFile()}>
                Open
                <DropdownMenuShortcut>{shortcut('O')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void editor.saveFile()}>
                Save
                <DropdownMenuShortcut>{shortcut('S')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void editor.saveFileAs()}>
                Save As...
                <DropdownMenuShortcut>{shiftShortcut('S')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void editor.exportParts()}>
                Export
              </DropdownMenuItem>
            </TopMenu>
            <TopMenu icon={<Pencil />} label="Edit">
              <DropdownMenuItem disabled={!editor.canUndo} onSelect={() => editor.undo()}>
                Undo
                <DropdownMenuShortcut>{shortcut('Z')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.canRedo} onSelect={() => editor.redo()}>
                Redo
                <DropdownMenuShortcut>{shiftShortcut('Z')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!editor.hasSelection} onSelect={() => editor.cut()}>
                Cut
                <DropdownMenuShortcut>{shortcut('X')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.hasSelection} onSelect={() => editor.copy()}>
                Copy
                <DropdownMenuShortcut>{shortcut('C')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.canPaste} onSelect={() => editor.paste()}>
                Paste
                <DropdownMenuShortcut>{shortcut('V')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.hasSelection} onSelect={() => editor.duplicate()}>
                Duplicate
                <DropdownMenuShortcut>{shortcut('D')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.selectAll()}>
                Select All
                <DropdownMenuShortcut>{shortcut('A')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!editor.canGroup} onSelect={() => editor.groupSelected()}>
                Group
                <DropdownMenuShortcut>{shortcut('G')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!editor.canUngroup}
                onSelect={() => editor.ungroupSelected()}
              >
                Ungroup
                <DropdownMenuShortcut>{shiftShortcut('G')}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!editor.hasSelection}
                onSelect={() => editor.deleteSelected()}
              >
                Delete
                <DropdownMenuShortcut>Del</DropdownMenuShortcut>
              </DropdownMenuItem>
            </TopMenu>
            <TopMenu icon={<CircleHelp />} label="Help">
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
        <SidebarProvider open={false} className="relative min-h-0 flex-1 overflow-hidden">
          <SidebarInset className="relative h-full min-h-0 min-w-0 overflow-hidden p-0">
            <div data-slot="scene-hud">
              <ToolsSidebar
                tool={editor.tool}
                onTool={editor.setTool}
                hasSelection={editor.hasSelection}
                onDuplicate={editor.duplicate}
                onDelete={editor.deleteSelected}
                onFocus={() => setFocusToken((value) => value + 1)}
                showHoles={editor.showHoles}
                onToggleHoles={editor.toggleHoles}
                canGroup={editor.canGroup}
                onGroup={editor.groupSelected}
                canUngroup={editor.canUngroup}
                onUngroup={editor.ungroupSelected}
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
              </div>
              <div
                ref={fpsLabel}
                className="absolute top-2 right-2 select-none font-mono text-xs tabular-nums text-white/70"
              >
                0 FPS
              </div>
            </div>
            <Canvas
              data-slot="scene"
              className={`h-full w-full${editor.placingPart ? ' cursor-crosshair' : ''}`}
              camera={{ position: CAMERA_POSITION, fov: 50, near: 0.3, far: 2000 }}
              frameloop="always"
              gl={{ stencil: true }}
              onPointerMissed={editor.onPointerMissed}
              onContextMenu={(event) => event.preventDefault()}
            >
              <color attach="background" args={['#181818']} />
              <ambientLight intensity={0.6} />
              <directionalLight position={[8, 12, 6]} intensity={0.8} />
              <CameraProjection ortho={editor.ortho} />
              {editor.showGrid ? <InfiniteGrid /> : null}
              <SceneParts
                parts={editor.parts}
                selectedIds={editor.selectedIds}
                primaryId={editor.primaryId}
                connectedIds={editor.connectedIds}
                interactive={!editor.placingPart && editor.tool !== 'move'}
                showHoles={editor.showHoles}
                detectHoles={editor.placingPart != null}
                showGizmos={editor.tool === 'transform'}
                onSelect={editor.selectPart}
                onTransform={editor.transformPart}
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
              <FocusCamera point={editor.primary?.position ?? null} token={focusToken} />
              <BoxSelect enabled={!editor.placingPart} parts={editor.parts} onSelect={boxSelect} />
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
      </div>
    </TooltipProvider>
  )
}

export default App
