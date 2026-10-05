# Pibooth Creator

Visual editor for building templates compatible with the
[pibooth-picture-template](https://github.com/pibooth/pibooth-picture-template) plugin, without going
through the ML editor (Flowchart Maker / draw.io), which isn't very intuitive for beginners.

## Features

- Choose the page size (4x6", 2x6" photo strip, 5x7", 6x8", or custom) and the resolution (DPI).
- For each photo count (1 to 4) and each orientation (portrait / landscape):
  - Add background and foreground (frame) images, freely positionable and resizable, with layer
    ordering (z-index) control.
  - Add numbered photo zones (1 to 4), draggable, resizable, and rotatable with the mouse.
  - Add text zones (`footer_text1`, `footer_text2`) supported by the plugin.
  - Button to duplicate a portrait layout into landscape (automatic rotation of the zones).
- One-click export to a `picture_template.xml` file directly usable by the plugin (native
  `mxGraphModel` format, no dependency on draw.io).
- Import an existing `.xml` template (even one made by hand in draw.io) or a `.zip` project exported
  from this app.
- Undo/redo (Ctrl+Z / Ctrl+Y).

## Usage

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

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
