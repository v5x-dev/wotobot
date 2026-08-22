# wotobot

A browser-based 3D CAD for prototyping VEX-style robots. Built with React, TypeScript, Vite, react-three-fiber, Tailwind CSS, and shadcn/ui.

## Features

- **3D scene** — perspective/orthographic camera, orbit controls, infinite grid, fullscreen mode
- **Parts catalog** — pick parts from the sidebar and place them with a live preview that snaps to holes on existing parts
- **Editing tools** — transform gizmos, move tool, color painting, box select, hole visualization, part focus (`F`)
- **Clipboard & history** — undo/redo, cut/copy/paste, duplicate, multi-select
- **Documents** — designs save as `.wbb` files; export the parts list as text
- **Build constraints** — live total weight readout and polycarbonate budget warnings

## Getting started

```sh
npm install
npm run dev
```

Then open the printed localhost URL.

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start the dev server         |
| `npm run build`   | Type-check and build for prod |
| `npm run preview` | Preview the production build |
| `npm run lint`    | Lint with oxlint             |

## Keyboard shortcuts

macOS uses `⌘` where Windows/Linux use `Ctrl`.

| Shortcut            | Action      |
| ------------------- | ----------- |
| `Ctrl+N` / `O` / `S`| New / Open / Save |
| `Ctrl+Shift+S`      | Save As     |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo |
| `Ctrl+X` / `C` / `V`| Cut / Copy / Paste |
| `Ctrl+D`            | Duplicate   |
| `Ctrl+A`            | Select All  |
| `Del`               | Delete selection |
| `F`                 | Focus camera on selection |

Mouse: right-drag orbits, middle-drag pans.
