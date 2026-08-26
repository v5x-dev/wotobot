import type { useRobotEditor } from '@/editor/useRobotEditor'

type Editor = ReturnType<typeof useRobotEditor>

export type TutorialStep = {
  id: string
  title: string
  target?: string // CSS selector to highlight
  description: string
  detail?: string
  hint?: string
  validate?: (editor: Editor) => boolean
  validateLabel?: string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to wotobot',
    description:
      'wotobot is a browser-based 3D CAD for VEX-style robots — a web reimplementation of the Protobot concept. This interactive tour will teach you the editor and show how it differs from the Unity desktop app at ../../contrib/Protobot-Rebuilt.',
    detail:
      'Protobot Rebuilt is a Windows Unity 2021.3.5f1 app (GPLv3, Protobot Rebuilt.zip → Protobot Rebuilt.exe). wotobot reuses its parts catalog, holes, weights, and FBX models — extracted by scripts/extract-cad-data.py and scripts/extract-parts.py — but runs in any modern browser with no install.',
    hint: 'Click Next to start. You can exit anytime from Help → Interactive tutorial.',
  },
  {
    id: 'navigation',
    title: '1 — Navigate the 3D view',
    target: '[data-tutorial="scene"]',
    description:
      'Right-drag to orbit, middle-drag to pan, scroll to zoom. Press F to focus the camera on the selected part.',
    detail: 'Try it now: right-drag around, middle-drag to pan, scroll to zoom. The axis gizmo at the top-right shows orientation. Use G to toggle the grid and O to switch perspective ↔ orthographic.',
    hint: 'Target: canvas [data-slot="scene"] at src/App.tsx:486',
  },
  {
    id: 'catalog',
    title: '2 — Parts catalog',
    target: '[data-tutorial="parts-catalog"]',
    description:
      'The right sidebar is the parts catalog — Structure / Motion / Electronics / Pneumatics / Competition. Search filters by name, and clicking a part enters placement mode with a live ghost preview.',
    detail:
      'Protobot Rebuilt uses the same prefabs from Assets/Resources/Part Prefabs — wotobot keeps unityGroup and generator fields (aluminum, shaft, polycarbonate, etc.) and the same group order from src/model/parts.ts:5.',
    hint: 'Open the catalog on the right and click any part to see its param popover (size, length, width).',
  },
  {
    id: 'placement',
    title: '3 — Place and snap parts',
    target: '[data-tutorial="scene"]',
    description:
      'Move the ghost over the grid or near an existing part — it snaps to hole faces (placementSnap.ts:53). Hold Space to flip to the opposite face, press R then move the mouse to rotate around the hole normal, click to place, Esc to cancel.',
    detail:
      'Shafts snap along the hole centerline, not the face. Params stay live in the popover — change them between clicks without exiting placement.',
    hint: 'Task: place a C-Channel. Look for the translucent ghost, hold Space to see the flip, press R and drag to spin, then click.',
    validate: (editor) => editor.parts.length >= 1,
    validateLabel: 'Placed 1+ part',
  },
  {
    id: 'selection',
    title: '4 — Select, box-select, and focus',
    target: '[data-tutorial="scene"]',
    description:
      'Click a part to select it. Shift+click adds to the selection. Hold B and left-drag to box-select. Ctrl+A selects all. Click empty space to clear.',
    detail:
      'Press F to frame the primary selection — same binding as Protobot Rebuilt. Selected parts show an outline; the Properties panel appears at the bottom-left.',
    hint: 'Task: select your placed part, then try Shift+click and B-drag.',
    validate: (editor) => editor.hasSelection,
    validateLabel: 'Made a selection',
  },
  {
    id: 'transform',
    title: '5 — Transform & move selection',
    target: '[data-tutorial="tools-sidebar"]',
    description:
      'Tool 1 (Transform) shows drei TransformControls gizmos — drag axes to move/rotate. Shift+D picks up the selection and re-enters placement so you can re-snap it to a different hole.',
    detail:
      'Protobot Rebuilt has dedicated PositionAxis / PositionPlane / RotateRing gizmos. The Properties panel (bottom-left) mirrors X/Y/Z and RX/RY/RZ numerically — edits commit on blur/Enter.',
    hint: 'Try: select a part → press 1 and drag the gizmo → press Shift+D to re-snap it.',
    validate: (editor) => editor.tool === 'transform',
    validateLabel: 'Tried a tool',
  },
  {
    id: 'color',
    title: '6 — Color & holes',
    target: '[data-tutorial="tools-sidebar"]',
    description:
      'Tool 2 (Color) paints the selection. A swatch palette appears from src/model/colors.ts — Default resets to the original material. H toggles cyan hole markers on every part.',
    detail:
      'Both apps have a custom color picker. In wotobot the palette callback at src/App.tsx:452 calls setColor (for next placements) and paintSelected (for current selection) immediately.',
    hint: 'Select a part, press 2, pick a preset or Custom. Press H to see holes.',
  },
  {
    id: 'chains',
    title: '7 — Sprocket chains (wotobot-only)',
    target: '[data-tutorial="tools-sidebar"]',
    description:
      'Place two coplanar sprockets (Motion → Sprocket) so they share a plane. Select exactly those two → the Link button in the left rail enables. Click to add a chain loop; it follows the sprockets as they move. Select the same pair again to remove.',
    detail:
      'Protobot Rebuilt has a general Object Link / Vector Link system (MatchObjectLinkTransform.cs) — not chain-specific. wotobot renders an explicit SprocketChain loop (src/model/chains.ts:5) with a live link-count badge (ChainBadge) and chain-aware copy/paste/duplicate.',
    hint: 'Task: place two sprockets, Shift+click both, then click Link. Try dragging one with Transform — the chain updates.',
    validate: (editor) => editor.chains.length >= 1,
    validateLabel: 'Created a chain',
  },
  {
    id: 'polycarbonate',
    title: '8 — Polycarbonate shapes',
    target: '[data-tutorial="properties-panel"]',
    description:
      'Polycarbonate (Structure) starts as a 4×8 in rectangle. After placement, select it — the Properties panel shows Edit shape. Outline mode drags vertices/edges; Holes mode adds circular cutouts.',
    detail:
      'Shape lives in PlacedPart.shape: { kind: polygon, thickness, points, holes } (src/model/parts.ts:41). Validation uses MAX_FOOTPRINT_SHORT/LONG from src/model/polycarbonateLimits.ts — shown in the shape editor.',
    hint: 'Place a Polycarbonate part and open Edit shape to try polygon editing.',
  },
  {
    id: 'constraints',
    title: '9 — Build constraints',
    target: '[data-tutorial="weight-badge"]',
    description:
      'Bottom badges: weight (always visible) sums partWeightGrams() → pounds to two decimals (WeightBadge.tsx:7). Polycarbonate badge appears only when over limit (PolycarbonateBadge.tsx:13).',
    detail:
      'Limits from src/model/polycarbonateLimits.ts:96 — max 12 pieces, total area 32 in² (4×8), per-piece footprint ≤4×8, thickness ≤0.07 in (default 0.0625). Hover the red badge for per-piece reasons. Protobot Rebuilt has no live weight/PC budget HUD.',
    hint: 'Watch the weight badge update as you build. Add many Polycarbonate panels to trigger the red warning.',
  },
  {
    id: 'files',
    title: '10 — Files & export',
    target: '[data-tutorial="top-bar"]',
    description:
      'File menu: New, Open, Save, Save As — .wbb JSON (version 5: parts + chains + camera at src/persistence/document.ts:12) via File System Access API with download fallback (fileIO.ts:106). Dirty state adds * and guards beforeunload. Double-click the centered filename to rename.',
    detail:
      'Export downloads a BOM text via partsListText() (src/model/weight.ts:96) with counts, weights, disclaimer, and total pounds. Unlike Protobot Rebuilt’s Firebase-backed cloud saves (SavedObject.cs + AuthUI), wotobot saves locally and needs no accounts.',
    hint: 'Try File → Save (Ctrl+S) — check the * disappears — then File → Export and open the text file.',
  },
  {
    id: 'onshape',
    title: '11 — Import from Onshape',
    target: '[data-tutorial="top-bar"]',
    description:
      'File → Import from Onshape… opens a STEP picker (openStepFile at fileIO.ts:86). A worker (stepImport.worker.ts) converts the file via convertStepToMetadata → stepMetadataToParts (onshapeParts.ts), mapping assembly components to catalog names.',
    detail:
      'If nothing maps, you’ll see “No supported Protobot catalog parts were found.” (src/App.tsx:253). Success loads the parts without changing the camera, then renames the document to the STEP filename. Protobot Rebuilt has no STEP import.',
    hint: 'Export a STEP from Onshape and try importing it here.',
  },
  {
    id: 'shortcuts',
    title: '12 — Shortcuts & customization',
    target: '[data-tutorial="top-bar"]',
    description:
      'Help → Keyboard shortcuts opens HotkeyDialog (src/hotkeys.ts:20). Click a binding, press the new chord (hotkeyFromEvent at hotkeys.ts:67), Backspace to clear, Reset to restore defaults. Bindings persist as protobot.hotkeys.v1 in localStorage.',
    detail:
      'Defaults: File Mod+N/O/S/Shift+S, Edit Mod+Z/Shift+Z/X/C/V/D/A/G/Shift+G/Del/Shift+D, Tools 1/2/R/Space/B, View F/H/G/O. macOS shows ⌘/⇧/⌥ via formatHotkey().',
    hint: 'Open Help → Keyboard shortcuts and try rebinding any action.',
  },
  {
    id: 'vs-protobot',
    title: '13 — wotobot vs Protobot Rebuilt',
    description:
      'Side-by-side: wotobot = React 19 + Vite + r3f + Tailwind (any browser, npm install or static dist/ ~113 MB); Protobot Rebuilt = Unity 2021.3.5f1 Windows player (download zip, run exe, UnityPlayer.dll).',
    detail:
      'What both have: color picker, hole-snapped placement (HoleDetector.cs ↔ placementSnap.ts), duplicator/deleter, param popovers, and the same part families.\n\nOnly Protobot Rebuilt: InsertScrewTool, MoveHoleTool, MoveShaftTool, Object/Vector Link system, Firebase Auth + cloud saves, background color & Builds.\n\nOnly wotobot: sprocket chain loops, live weight/PC badges, Onshape STEP import, BOM export, ortho toggle, box-select marquee (B), hole overlay, fullscreen, group/ungroup (groupId), customizable hotkeys, perf HUD (FPS/triangles/draw calls).',
    hint: 'Changes to Assets/Resources/Part Prefabs belong in Protobot Rebuilt, then re-extract here via the Python scripts.',
  },
  {
    id: 'challenge',
    title: '14 — Guided build challenge',
    description:
      'Use everything: place two C-Channels (35 holes) as rails, two 15-hole cross-braces (Space to flip), a Motor snapped outside a rail, a Shaft through its bore, two coplanar Sprockets (12T + 36T), Link them, add a Wheel to the 36T shaft, dupe (Ctrl+D) to the other rail, paint with Tool 3, then Save as drivetrain.wbb and Export the BOM.',
    detail:
      'Checklist: rails → braces → motor → shaft → sprockets → Link → wheel → duplicate → paint → badges → Save → Export. Regenerate catalogs after pulling Protobot Rebuilt with python scripts/extract-cad-data.py && python scripts/extract-parts.py.',
    hint: 'Complete the challenge, then frame it with Ctrl+A → F. View triangles/draw calls at the top-right HUD (FpsCounter).',
    validate: (editor) => editor.parts.length >= 8 && editor.chains.length >= 1,
    validateLabel: 'Built rails + chain (8 parts, 1 chain)',
  },
]
