# wotobot tutorial

A hands-on walkthrough for the browser CAD at `src/App.tsx:170`. Pair it with the live app — every step names the exact button, menu, and shortcut you can press.

> **Interactive version:** open **Help → Interactive tutorial** in the running app (`src/App.tsx:357` / `src/components/tutorial/TutorialOverlay.tsx:1`). It highlights the real UI, validates tasks like placing a part or creating a chain (`src/components/tutorial/tutorialSteps.tsx:1`), and stores completion in `localStorage` (`wotobot.tutorialSeen.v1`). This document is the companion reference — same steps with code links.

> **Lineage:** wotobot is a web reimplementation of the Protobot concept. Its parts catalog, hole patterns, weights, FBX models, and icons are extracted from the Unity project at `../../contrib/Protobot-Rebuilt` (canonical path `~/Work/contrib/Protobot-Rebuilt`) by `scripts/extract-cad-data.py:10` and `scripts/extract-parts.py:5`. Shared concepts (groups, hole snapping, color) are intentional; runtime, storage, and several tools differ — see [How wotobot differs from Protobot Rebuilt](#how-wotobot-differs-from-protobot-rebuilt) at the end.

---

## 1. Run it

```sh
npm install
npm run dev
```

Open the localhost URL Vite prints (typically `http://localhost:5173`). No accounts, no installer — any modern browser works. The production build (`npm run build` at `package.json:8`) is a static `dist/` site; keep `dist/protobot-models/` alongside `dist/index.html` or models fail to load.

---

## 2. Tour of the editor

Open `src/App.tsx:279` and you will see four persistent regions.

**Top bar** (`src/App.tsx:280`):

- Left: **File**, **Edit**, **Help** icon menus (`src/App.tsx:282`).
  - File: New, Open, Save, Save As, **Import from Onshape…**, **Export** (BOM text).
  - Edit: Undo/Redo, Cut/Copy/Paste, Duplicate, Select All, Group/Ungroup, Delete.
  - Help: Keyboard shortcuts, Documentation (`https://protobot.web.app/` at `src/App.tsx:48`), About.
- Center: filename. Double-click to rename inline (`src/App.tsx:394`); a trailing `*` means unsaved changes (`src/App.tsx:401`). `document.title` tracks the dirty state and `beforeunload` guards against accidental close (`src/App.tsx:1085`).
- Right: fullscreen toggle (`src/App.tsx:410`).

**Left rail — tool palette** (`src/components/editor/ToolsSidebar.tsx:88`):

| Button | Action | Default binding (`src/hotkeys.ts:20`) |
|---|---|---|
| Transform (mouse icon) | Gizmo move/rotate on selection | `1` |
| Move (cube+arrows) | Pick up a placed part and re-snap it | `2` or `Shift+D` (move selection) |
| Color (palette) | Paint selection | `3` |
| Link / Unlink chain | Add or remove a sprocket chain | enabled only when two coplanar sprockets are selected |
| Duplicate / Delete / Focus | Operate on selection | `Ctrl+D`, `Del`, `F` |
| Group / Ungroup | Give selected parts a shared `groupId` (`src/editor/useRobotEditor.ts:712`) | `Ctrl+G` / `Ctrl+Shift+G` |
| Show holes | Toggle cyan hole markers | `H` (`src/App.tsx:161`) |
| Perspective / Orthographic | Toggle projection | `O` |

Hover any tool for its current binding — labels are rendered via `formatHotkey()` at `src/components/editor/ToolsSidebar.tsx:93`.

When the Color tool is active, `ColorSwatches` appears at `src/components/editor/ToolsSidebar.tsx:182` with presets from `src/model/colors.ts` plus a native color input.

**Right sidebar — parts catalog** (`src/components/editor/AddSidebar.tsx:124`):

- Search field filters by name/group (`src/model/parts.ts:matchesSearch`).
- Groups in order (`src/model/parts.ts:5`): **Structure**, **Motion**, **Electronics**, **Pneumatics**, **Competition**. Click a part to enter placement mode.
- A popover anchored to the selected row shows the part's `param1`/`param2` (e.g., C-Channel width in holes, Angle size, Polycarbonate width/height in inches). Custom numeric params validate against `min`/`max` via `paramError()` (`src/model/parts.ts`); dependent options for `param2` come from `param2Options()` (`src/components/editor/AddSidebar.tsx:107`).

**Scene HUD**:

- Bottom-center badges: total weight (`src/components/editor/WeightBadge.tsx:7` — `totalWeightPounds(parts).toFixed(2)`), polycarbonate over-limit warning (`src/components/editor/PolycarbonateBadge.tsx:11`), chain link count (`src/components/editor/ChainBadge.tsx`) when a chain is selected.
- Top-right stats (`src/App.tsx:477`): FPS (`src/components/scene/FpsCounter.tsx`), model count, triangle count, draw calls. The axis gizmo (`src/App.tsx:556` with `AXIS_COLORS`) sits in the same corner.
- Hidden until active: placement ghost (`src/components/scene/PlacementPreview.tsx`), properties panel (`src/components/editor/PropertiesPanel.tsx`), polycarbonate shape editor.

---

## 3. Navigate the 3D view

`src/App.tsx:544` configures the camera and controls:

- **Orbit:** right-drag. **Pan:** middle-drag (`mouseButtons` at `src/App.tsx:549`). **Zoom:** scroll wheel (min 0.5, max 1000 distance).
- **Focus:** select something, press `F` (`src/hotkeys.ts:42`) — `FocusCamera` at `src/App.tsx:79` moves the orbit target to the primary part.
- **Grid:** `G` toggles `InfiniteGrid` (`src/components/scene/InfiniteGrid.tsx`) via `showGrid` state (`src/App.tsx:161`).
- **Projection:** `O` swaps `PerspectiveCamera`/`OrthographicCamera` (`src/App.tsx:108`). Ortho preserves view distance by converting FOV to half-height (`src/App.tsx:128`).
- **Fullscreen:** button at `src/App.tsx:410` or the browser's own F11. `src/App.tsx:201` listens for `fullscreenchange`.

Tip: if you lose the model, select all (`Ctrl+A`) then `F`.

---

## 4. Place your first parts

1. In the right catalog click **C-Channel** (Structure). The row highlights and the param popover appears. Leave `Length` / `Size` at defaults or pick another value.
2. Move the cursor over the grid. A translucent ghost follows it (`src/components/scene/PlacementPreview.tsx:200`). When the ghost is near an existing part, it snaps to a hole face — see `snapPlacement()` in `src/model/placementSnap.ts:53`. Shafts snap along the hole centerline within `SHAFT_SNAP_RANGE`.
3. **Flip:** hold `Space` (`src/hotkeys.ts:40` → `flipPlacement`). `src/editor/useRobotEditor.ts:958` sets `flipHole=true` on keydown and clears it on keyup (`src/editor/useRobotEditor.ts:1082`) — the ghost jumps to the opposite face of the material. Release to keep the current face.
4. **Rotate:** press `R` (`src/hotkeys.ts:39`) while placing. `src/editor/useRobotEditor.ts:972` toggles `rotatingPlacement`; `src/components/scene/PlacementPreview.tsx:86` then tracks mouse angle via `atan2` and spins the ghost around the hole normal. Move the mouse, watch the ghost rotate, press `R` again or click to lock.
5. **Click** on the scene to place. `onPlace` at `src/editor/useRobotEditor.ts:230` pushes an undo snapshot and appends the `PlacedPart`. Keep clicking to place copies; the popover stays live so you can change `param1`/`param2` between placements and call `onUpdatePlacing` (`src/components/editor/AddSidebar.tsx:114`).
6. **Cancel:** `Esc` (`src/editor/useRobotEditor.ts:949`) or click the same catalog row again (`src/components/editor/AddSidebar.tsx:91`).

Params are editable after placement too — select the part and use the Properties panel (next section).

### Your first three parts

Try this to verify snapping:

1. Place a **C-Channel (35 holes)** on the grid.
2. Place a second **C-Channel (15 holes)** — hover near a hole on the first channel until the ghost snaps flush, then `Space` to check both faces, then click.
3. Place a **Shaft** — hover over any hole; the shaft's axis aligns with the hole centerline.

Toggle `H` to see every hole marker on every part.

---

## 5. Select, move, and transform

**Select:**

- Click a part → primary selection (`src/components/scene/SelectablePart.tsx:592` calls `onSelect(event.shiftKey)`). `primaryId` drives the Properties panel and `F` focus.
- `Shift+click` adds to `selectedIds` (`src/editor/useRobotEditor.ts:selectPart`).
- **Box select:** hold `B` (`src/hotkeys.ts:41`) and left-drag across the canvas. `src/components/scene/BoxSelect.tsx:35` projects each part's bounds to screen space and calls `boxSelect()` at `src/App.tsx:228`.
- `Ctrl+A` selects all (`src/editor/useRobotEditor.ts:selectAll`).

**Transform tool (`1`)** — `src/App.tsx:513` enables gizmos:

- `TransformControls` from `@react-three/drei` appear on the primary part. Drag the axis handles. Live preview goes through `previewPartTransform`; commit goes through `transformPart` (`src/editor/useRobotEditor.ts`). Grouped parts (`groupId`) move together.
- The **Properties panel** (`src/components/editor/PropertiesPanel.tsx:58`) mirrors the same state with numeric `X/Y/Z` and `RX/RY/RZ` fields. Edits call `transformPart` directly — useful for precise offsets.

**Move tool (`2`)**:

- Select one or more parts, press `Shift+D` (or `2` then `Shift+D`). `startMoveSelection()` at `src/editor/useRobotEditor.ts:712` creates a `PendingPart` from the primary selection and re-enters placement mode, so you can re-snap the existing part to a different hole. This is distinct from duplicating — the original part moves.

**Other edits:**

- **Duplicate:** `Ctrl+D` (`src/editor/useRobotEditor.ts:duplicate`) clones parts and any chains whose both sprockets were cloned.
- **Delete:** `Del` / `Backspace` (`src/editor/useRobotEditor.ts:deleteSelected`).
- **Group:** `Ctrl+G` assigns a shared `groupId` (`src/editor/useRobotEditor.ts:712`); `Ctrl+Shift+G` removes it. Grouped parts stay selected together.
- **Undo/Redo:** `Ctrl+Z` / `Ctrl+Shift+Z` push/pop `Snapshot` stacks that clone `parts`, `chains`, and `camera` (`src/editor/useRobotEditor.ts:pushHistory`).
- **Clipboard:** `Ctrl+X/C/V` copy `ClipboardPart` + `ClipboardChain`; paste offsets by `PASTE_OFFSET` (`src/persistence/document.ts:PASTE_OFFSET`).

---

## 6. Paint color

1. Select one or more parts.
2. Press `3` or click the palette icon. `ColorSwatches` appears at `src/components/editor/ToolsSidebar.tsx:189`.
3. Pick a preset or use the **Custom** color input. `hexToRgb`/`rgbToHex` in `src/model/colors.ts` converts for storage. `Default` passes `null` which restores the part's original material (`src/components/editor/ToolsSidebar.tsx:201`).
4. The callback at `src/App.tsx:452` calls both `setColor` (for the next placement) and `paintSelected` (for the current selection).

Color is stored per `PlacedPart.color` as `[r,g,b]` or `null` (`src/model/parts.ts`).

---

## 7. Polycarbonate — custom shapes

Select **Polycarbonate** (Structure, generator `polycarbonate` at `src/model/partsCatalog.ts`). Defaults are `4×8` in. Two ways to edit:

- **Simple rectangle:** the param popover exposes Width/Height (custom numeric, `0.25–144` in). Changes flow through `onUpdatePlacing`.
- **After placement:** select the polycarbonate part — the Properties panel shows an **Edit shape** button that opens `PolycarbonateShapeEditor` (`src/components/editor/PolycarbonateShapeEditor.tsx:131`). Inside:
  - `outline` mode: drag polygon vertices/edges to reshape the outer contour.
  - `holes` mode: add/remove circular cutouts.
  - The dialog validates against `MAX_FOOTPRINT_SHORT`/`LONG` (`src/components/editor/PolycarbonateShapeEditor.tsx:check`).

Shape data lives in `PlacedPart.shape: PolycarbonateShape` (`src/model/parts.ts:41` — `{ kind:'polygon', thickness, points, holes }`).

---

## 8. Sprocket chains

Chains in wotobot are visual and length-aware; they are **not** in the original Protobot Rebuilt link system (see comparison below).

1. Place two **Sprockets** (Motion) so their faces are coplanar. Any size pairing works but they must share a plane — `chainSelection()` at `src/model/chains.ts:112` checks `isSprocket` and coplanarity and returns `reason` if not.
2. Select **exactly** those two sprockets (`Shift+click` the second).
3. The chain button in the left rail enables (`src/components/editor/ToolsSidebar.tsx:107` — `chainAction` becomes `'add'`). Click it. `toggleSelectedChain()` at `src/editor/useRobotEditor.ts:682` creates a `SprocketChain { id, sprocketAId, sprocketBId }`.
4. A loop renders around the pair (`src/components/scene/SprocketChains.tsx`), and `ChainBadge` shows the link count. Move either sprocket — the loop updates automatically.
5. With the same two sprockets selected, the button flips to **Remove chain** (`chainAction === 'remove'` → `Unlink2` icon). Click to delete.
6. Selecting a chain itself (click the rendered loop) sets `selectedChainId` (`src/App.tsx:506`) and highlights it via `SprocketChains` interactive mode.

Chains are saved in `.wbb` (`RobotDocument.chains` at `src/persistence/document.ts:15`), and copy/paste/duplicate of sprockets carries their chains when both endpoints are included (`src/editor/useRobotEditor.ts:copiedChains`).

---

## 9. Build constraints

Two badges live at `src/App.tsx:470`:

- **Weight** — always visible. `WeightBadge` at `src/components/editor/WeightBadge.tsx:7` sums `partWeightGrams()` (`src/model/weight.ts:61` / `src/model/weightsCatalog.ts`) and displays `gramsToPounds` to two decimals.
- **Polycarbonate** — appears only when over a limit (`src/components/editor/PolycarbonateBadge.tsx:13` — `if (!status.over) return null`). `evaluatePolycarbonate()` at `src/model/polycarbonateLimits.ts:96` checks:
  - Count > `MAX_POLYCARBONATE_PIECES` (12)
  - Total area > `MAX_TOTAL_AREA` (4×8 = 32 in² — `MAX_FOOTPRINT_SHORT`×`MAX_FOOTPRINT_LONG`)
  - Per-piece footprint: each piece must fit within 4×8 (`fitsFootprint` at `src/model/polycarbonateLimits.ts:62`)
  - Thickness > `MAX_THICKNESS` (0.07 in, default 0.0625 at `src/model/polycarbonateLimits.ts:7`)

  Hover the red badge for per-piece reasons (`polycarbonateLimitReasons`).

These limits mirror VEX-style rules and update live as you build.

---

## 10. Files, export, and Onshape import

**Documents (`.wbb`)** — `src/persistence/document.ts:12`:

```ts
type RobotDocument = { version: 5, parts: PlacedPart[], chains?: SprocketChain[], camera?: CameraState }
```

- **New** (`Ctrl+N`): clears to `debugStartupParts()` / `DEFAULT_CAMERA`.
- **Open** (`Ctrl+O`): `openTextFile()` / `showOpenFilePicker` at `src/persistence/fileIO.ts:69` with `.wbb` filter; parses via `parseDocument` with version migration.
- **Save** (`Ctrl+S`): `saveTextFile()` at `src/persistence/fileIO.ts:106` tries the File System Access API; falls back to `downloadBlob` (`src/persistence/fileIO.ts:47`).
- **Save As** (`Ctrl+Shift+S`): always prompts for a new handle.
- **Dirty guard:** `dirty` compares `serializeDocument(parts, camera, chains)` against `savedJson` (`src/editor/useRobotEditor.ts:savedJson`).

Double-click the centered filename to rename — `stemName`/`renameFile` at `src/persistence/document.ts` preserves the `.wbb` extension.

**Export — parts list** — File → Export (`src/App.tsx:303`). `partsListText()` at `src/model/weight.ts:96` aggregates identical parts, prints each count and weight, plus a header disclaimer and `Total Estimated Weight: X lbs`. The browser downloads it as text via `exportTextFile` (`src/persistence/fileIO.ts:133`).

**Import from Onshape** — File → Import from Onshape… (`src/App.tsx:300`):

1. Pick a STEP file (`.step`/`.stp`). `openStepFile()` at `src/persistence/fileIO.ts:86` returns a `File`.
2. A progress dialog (`src/components/editor/OnshapeImportDialog.tsx:54`) appears. `convertStepToMetadata()` at `src/persistence/onshapeImport.ts` runs in a worker (`src/persistence/stepImport.worker.ts`) and reports progress (`Reading file`, `Scanning…`, `Decoding…`). A 30s threshold shows elapsed time and size (`src/components/editor/OnshapeImportDialog.tsx:48`).
3. `stepMetadataToParts()` at `src/persistence/onshapeParts.ts` maps assembly components to catalog entries by name/metadata. If nothing matches, you get `No supported Protobot catalog parts were found in this STEP assembly.` (`src/App.tsx:253`). On success, `importParts()` adds them to the scene and renames the document to the STEP filename.
4. Cancel at any time — `AbortController` at `src/App.tsx:236` aborts the worker.

---

## 11. Shortcuts and customization

Defaults live in `HOTKEY_DEFINITIONS` at `src/hotkeys.ts:20`:

| Group | Action | Default |
|---|---|---|
| File | New / Open / Save / Save As | `Mod+N` / `O` / `S` / `Shift+S` |
| Edit | Undo / Redo | `Mod+Z` / `Mod+Shift+Z` |
| Edit | Cut / Copy / Paste / Duplicate / Select all | `Mod+X` / `C` / `V` / `D` / `A` |
| Edit | Group / Ungroup / Delete / Move selection | `Mod+G` / `Mod+Shift+G` / `Del` / `Shift+D` |
| Tools | Transform / Move / Color / Rotate placement / Flip placement / Box select | `1` / `2` / `3` / `R` / `Space` / `B` |
| View | Focus / Show holes / Show grid / Toggle projection | `F` / `H` / `G` / `O` |

`Help → Keyboard shortcuts` opens `HotkeyDialog` (`src/components/editor/HotkeyDialog.tsx`). Click a row, press the new chord — `hotkeyFromEvent()` at `src/hotkeys.ts:67` serializes `Mod`/`Shift`/`Alt`+key. Conflicts are flagged inline. Bindings persist in `localStorage` under `protobot.hotkeys.v1` (`src/hotkeys.ts:52`) and survive reloads; **Reset** restores `DEFAULT_HOTKEYS`. macOS shows `⌘`/`⇧`/`⌥` via `formatHotkey()` at `src/hotkeys.ts:85`.

---

## 12. Guided build — mini drivetrain (10 minutes)

Follow this to exercise every major tool. No prior CAD experience needed.

**A. Base rails**

1. Create a new file (File → New or `Ctrl+N`).
2. Place **C-Channel 1×2×1 (35 holes)** at the origin. This is your left rail.
3. Place a second **C-Channel 1×2×1 (35 holes)** parallel, snapped to the opposite side of a future cross-brace — use the hole preview to keep them coplanar.

**B. Cross-brace**

4. Pick **C-Channel 1×2×1 (15 holes)**. Hover over a hole near the front of the left rail until the ghost snaps flush. Hold `Space` to verify the flip side, release, click.
5. Repeat at the rear. You now have a rectangular chassis.
6. Select all (`Ctrl+A`), press `F` to frame it, then `H` to verify holes line up.

**C. Motion**

7. Add a **Motor** (Motion) — snap it to the outside of the left rail. The Editor picks `param1`/`param2` defaults automatically; adjust in the popover if needed.
8. Add a **Shaft** through the motor bore — hover over the motor's shaft hole until the ghost rides the centerline, click.
9. Add a **Sprocket (12T)** to that shaft, then another **Sprocket (36T)** further down the rail. Keep them coplanar (same offset from the rail).
10. Add a **Traction Wheel** or **Omni Wheel** to the 36T shaft.

**D. Chain**

11. Select exactly the two sprockets (`click` one, `Shift+click` the other). The chain button (left rail, `Link2` icon) enables. Click it — a chain loop appears and `ChainBadge` shows the link count.
12. Switch to Transform (`1`) and drag the 36T sprocket along the rail. The chain loop updates live.

**E. Finish and check**

13. Select the motor + shaft + sprockets + wheel, `Ctrl+D` to duplicate, then Transform-move the duplicate to the right rail (or use `Shift+D` move-re-snap).
14. Check constraints: bottom-center weight badge gives total pounds; if you added Polycarbonate panels, watch for the red `PC … over limit` badge and hover for details.
15. Paint: select the chassis, press `3`, pick a team color.
16. **Save** (`Ctrl+S`) as `drivetrain.wbb`. Then File → Export to download the BOM text and verify line counts.

You have now used catalog search, param popover, hole snapping, flip/rotate, selection, box select, transform, move, duplicate, grouping (optional: `Ctrl+G` the chassis), color, chains, weight/PC budgets, save, and export.

---

## 13. Polycarbonate shapes, properties, and performance

- **Properties panel:** with a single part selected, `PropertiesPanel` at `src/components/editor/PropertiesPanel.tsx:58` shows `X/Y/Z` and `RX/RY/RZ` fields that commit on blur/Enter. Polycarbonate parts gain the shape editor entry point.
- **Performance HUD:** `FpsCounter` at `src/components/scene/FpsCounter.tsx` reports via refs (`src/App.tsx:187`) to avoid extra renders; `frameloop="demand"` at `src/App.tsx:490` only renders on interaction. `dpr` is capped at `1.25` to bound GPU work.
- **Grid & projection:** both are document-independent view state, but `camera.ortho` is saved in `.wbb` so reopening restores the same projection.

---

## How wotobot differs from Protobot Rebuilt

The comparison below is against the sibling checkout at `../../contrib/Protobot-Rebuilt` (`~/Work/contrib/Protobot-Rebuilt`). That repository is the **Protobot Rebuilt** Unity project — GPLv3, Unity `2021.3.5f1` (`ProjectSettings/ProjectVersion.txt`), a continuation of `davegersh`'s Protobot, maintained under `BreadSoup/Protobot-Rebuilt` with binaries distributed as `Protobot Rebuilt.zip` → `Protobot Rebuilt.exe` (`README.md:6`).

### Shared lineage

- **Same parts:** `PARTS` at `src/model/partsCatalog.ts` is generated from `Assets/Resources/Part Prefabs` in Protobot Rebuilt. Fields like `unityGroup`, `generator` (`aluminum`/`child`/`single`/`plate`/`shaft`/`polycarbonate`), and `mesh.fbx`/`splitFbx` are preserved.
- **Same geometry sources:** hole patterns (`src/model/holes.ts`, `src/model/holesCatalog.ts`) and weights (`src/model/weightsCatalog.ts`) are extracted by `scripts/extract-cad-data.py` from the Unity prefabs; icons come from `Assets/Sprites`; FBX models under `public/protobot-models/` are copied from `Assets/Models`.
- **Same docs entry point:** both link to `https://protobot.web.app/` (`src/App.tsx:48`).
- **Regeneration:** re-run `python scripts/extract-cad-data.py` and `python scripts/extract-parts.py` after pulling Protobot Rebuilt to refresh catalogs.

### Side-by-side

|  | **wotobot** (this repo) | **Protobot Rebuilt** (`../../contrib/Protobot-Rebuilt`) |
|---|---|---|
| **Runtime** | React 19 + TypeScript + Vite + react-three-fiber + three.js + Tailwind 4 + shadcn/ui | Unity 2021.3.5f1 (C#), Windows standalone player |
| **Install** | `npm install && npm run dev` or host `dist/` (~113 MB with FBX) | Download `Protobot Rebuilt.zip` from Releases, unzip, run `.exe` |
| **Platform** | Any modern browser; no install for viewers if you host `dist/` | Windows; Unity player dependencies (`UnityPlayer.dll`, `MonoBleedingEdge`) |
| **Saving** | Local `.wbb` JSON (`version:5`, `src/persistence/document.ts:12` — parts + chains + camera) via File System Access API with download fallback (`src/persistence/fileIO.ts:106`) | Local saves via `Assets/Scripts/Saving/SavedObject.cs`; optional Firebase cloud saves |
| **Accounts** | None; `localStorage` only for hotkeys (`protobot.hotkeys.v1`) | Firebase Auth (`Assets/Scripts/User Management/AuthUI.cs`, `UsersDatabase.cs`) + `Firebase Client` |
| **File import** | STEP import from Onshape exports — worker-parsed, mapped to catalog via `src/persistence/onshapeParts.ts` | No STEP import in the Unity app |
| **File export** | `partsListText()` BOM with counts, grams→pounds, disclaimer (`src/model/weight.ts:96`) | Parts list UI (`PartsListUI.cs`, `ParamDisplay.cs`) rendered in-app |
| **License** | This repo's license | GPLv3 (`LICENSE`) |

### What both have

Color tool with custom picker, hole-snapped placement (`HoleDetector.cs` in Unity ↔ `placementSnap.ts` here), duplicator/deleter, parts list with per-part params, transform/position tooling (Unity: `PositionAxis`/`PositionPlane`/`RotateRing`; web: drei `TransformControls`), multi-select, and the same part families (Structure/Motion/Electronics/Pneumatics/Competition).

### Only in Protobot Rebuilt

- **Dedicated insert tools:** `InsertScrewTool.cs`, `MoveHoleTool.cs`, `MoveShaftTool.cs`/`NewMoveShaftTool.cs` as first-class tools.
- **Object/vector linking:** `Assets/Scripts/Link System/Object Link` & `Vector Link` (`MatchObjectLinkTransform.cs`, `ObjectLinkAction.cs`) — a general "make object A follow object B" mechanism.
- **Firebase cloud:** user accounts, cloud save/sync, and `UnsavedChangesUI`.
- **Unity-native editing:** scene-specific settings (`ProjectSettings/`), material/prefab editing, background color via `BackgroundColorChange.cs`, `Builds` management.

### Only in wotobot

- **Sprocket chains:** explicit `SprocketChain` model (`src/model/chains.ts:5`) rendered as a loop around two coplanar sprockets, with live link-count badge and chain-aware copy/paste — Protobot Rebuilt's link system is not chain-specific.
- **Build-constraint badges:** live total weight (`src/components/editor/WeightBadge.tsx`) and polycarbonate budget (`src/components/editor/PolycarbonateBadge.tsx`: 12 pieces / 32 in² / 4×8 footprint / 0.07 in thickness) with inline reasons.
- **Onshape STEP import**, **BOM text export**, **ortho/perspective toggle**, **box-select marquee** (`B`+drag), **hole overlay** (`H`), **grid toggle** (`G`), **fullscreen**, **group/ungroup** (`groupId`), **customizable hotkeys** with `localStorage` persistence, and a **performance HUD** (FPS/triangles/draw calls).

### When to use which

- **Use wotobot** when you want zero-install sharing (send a `dist/` link), browser-native workflows, STEP import for Onshape assemblies, or the live weight/polycarbonate feedback. Contributors comfortable with web tooling will find the Vite + Vitest + oxlint loop (`npm run check` at `package.json:9`) faster than the Unity editor.
- **Use Protobot Rebuilt** when you need its Unity-specific insert tools, Firebase-backed accounts/cloud saves, or to author the source prefabs/models that wotobot itself derives from. Changes to `Assets/Resources/Part Prefabs` or `Assets/Models` should be made there and then re-extracted here.

---

## Tips & troubleshooting

- **Models not loading:** the dev server serves `public/protobot-models/` at `/protobot-models/`; the production build expects `dist/protobot-models/` next to `index.html` (`README.md:42`). Do not flatten `dist/` — keep the subdirectory.
- **Nothing snaps:** toggle `H` to confirm holes exist on the target part, and ensure the ghost is within the hole-face snap radius. Shafts only snap along the centerline, not the face.
- **Chain button disabled:** select exactly two sprockets and verify they are coplanar. The tooltip (`chainActionReason` at `src/components/editor/ToolsSidebar.tsx:103`) explains why.
- **STEP import finds nothing:** only assembly components whose names map to entries in `src/model/partsCatalog.ts` are kept. Check `stepMetadataToParts` matching and verify the Onshape export included part names (not just raw BREP).
- **Lost shortcuts:** Help → Keyboard shortcuts → Reset, or clear `localStorage` key `protobot.hotkeys.v1`.
- **Huge `dist/`:** expected (~113 MB). `npm run build` type-checks (`tsc -b`) before Vite bundles; `oxlint` + `vitest` run in `npm run check`.

---

*See `README.md` for scripts and production deploy notes, and `src/editor/useRobotEditor.ts:142` for the full editor state machine.*
