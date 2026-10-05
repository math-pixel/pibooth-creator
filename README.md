# Pibooth Creator

A visual, drag-and-drop editor for building templates compatible with the
[pibooth-picture-template](https://github.com/pibooth/pibooth-picture-template) plugin — no draw.io,
no XML, no diagram editor required.

![Editor overview](docs/screenshots/01-overview.png)

## Why

`pibooth-picture-template` templates are plain `mxGraphModel` XML files, normally created and edited
by hand in the Flowchart Maker (draw.io) diagramming tool. That workflow is accurate but not very
approachable for beginners: you're placing raw rectangles and setting style strings, with no live
preview of how the final picture will actually look.

Pibooth Creator is a small web app that generates the exact same XML format, but through a real
canvas editor: drag images and photo zones, snap them to the center or to each other, reorder layers,
and export a `picture_template.xml` that drops straight into your `pibooth.cfg`.

## Features

- Canvas editor (drag, resize, rotate) with smart alignment guides (snaps to the page center, edges,
  and other elements).
- One editor tab per photo count (1 to 4) and per orientation (portrait / landscape) — only build the
  combinations you actually need.
- Background and foreground images (e.g. a printed frame) with full layer reordering — the plugin
  draws elements in that exact order, so this is what controls what's on top.
- Numbered photo zones (1–4) and the two text placeholders the plugin supports
  (`footer_text1` / `footer_text2`).
- Import an existing `.xml` template — even one made by hand in draw.io — to keep editing it visually.
- Export to a single `picture_template.xml`, or a `.zip` bundle with the XML, every source image as a
  plain file, and the full project state for a lossless re-import later.
- Undo/redo (Ctrl+Z / Ctrl+Y).

## Screenshots

**Dragging a photo zone, snapped to the page center**
![Dragging a photo zone with snap guides](docs/screenshots/02-snap-guides.png)

**Reordering background/foreground layers**
![Layers panel](docs/screenshots/03-layers.png)

**Exporting the finished template**
![Export panel](docs/screenshots/04-export.png)

**Importing an existing `.xml` template**
![Importing a template](docs/screenshots/05-import.png)

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

A `Dockerfile` is included if you'd rather self-host it (e.g. on Coolify, Railway, or any Docker host).

## Using the generated template in pibooth

1. Download `picture_template.xml` from the app.
2. Place it anywhere you like (e.g. `~/.config/pibooth/picture_template.xml`).
3. In `pibooth.cfg`, under the `[PICTURE]` section, set:
   ```ini
   [PICTURE]
   template = /path/to/picture_template.xml
   ```
4. Restart pibooth.

Only the combinations (photo count × orientation) you've enabled and defined photo zones for are
included in the export — no need to create everything at once.

## Credits

Built against the real parser of
[pibooth-picture-template](https://github.com/pibooth/pibooth-picture-template) by the pibooth team —
all credit for the plugin itself and its XML format goes to them. This project is just an alternative
way to produce that same file.
