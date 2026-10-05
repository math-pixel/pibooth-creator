import { useStore, getActiveLayout } from '../store';
import type { Layer } from '../types';
import { round2 } from '../utils';
import ExportPanel from './ExportPanel';

function layerLabel(layer: Layer): string {
  if (layer.kind === 'image') return `🖼 ${layer.label}`;
  if (layer.kind === 'capture') return `📷 Photo ${layer.number}`;
  return `🔤 ${layer.key}`;
}

function LayersPanel() {
  const layout = useStore(getActiveLayout);
  const selectedLayerId = useStore((s) => s.selectedLayerId);
  const selectLayer = useStore((s) => s.selectLayer);
  const moveLayer = useStore((s) => s.moveLayer);
  const removeLayer = useStore((s) => s.removeLayer);

  if (!layout) return null;
  const ordered = [...layout.layers].reverse(); // top of stack first in list

  return (
    <section>
      <h2>Layers (top → bottom)</h2>
      {ordered.length === 0 && <p className="hint-small">No elements yet. Add an image or a photo zone.</p>}
      <ul className="layers-list">
        {ordered.map((layer) => (
          <li key={layer.id} className={layer.id === selectedLayerId ? 'selected' : ''}>
            <button className="layer-row" onClick={() => selectLayer(layer.id)}>
              {layerLabel(layer)}
            </button>
            <div className="layer-actions">
              <button title="Move up" onClick={() => moveLayer(layer.id, 'up')}>
                ↑
              </button>
              <button title="Move down" onClick={() => moveLayer(layer.id, 'down')}>
                ↓
              </button>
              <button title="Delete" onClick={() => removeLayer(layer.id)}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PropertiesPanel() {
  const layout = useStore(getActiveLayout);
  const selectedLayerId = useStore((s) => s.selectedLayerId);
  const updateLayer = useStore((s) => s.updateLayer);
  const layer = layout?.layers.find((l) => l.id === selectedLayerId);

  if (!layer) {
    return (
      <section>
        <h2>Properties</h2>
        <p className="hint-small">Select an element on the canvas to see its properties.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Properties</h2>
      <div className="row">
        <label>
          X (in)
          <input
            type="number"
            step="0.05"
            value={round2(layer.xIn)}
            onChange={(e) => updateLayer(layer.id, { xIn: Number(e.target.value) })}
          />
        </label>
        <label>
          Y (in)
          <input
            type="number"
            step="0.05"
            value={round2(layer.yIn)}
            onChange={(e) => updateLayer(layer.id, { yIn: Number(e.target.value) })}
          />
        </label>
      </div>
      <div className="row">
        <label>
          Width (in)
          <input
            type="number"
            step="0.05"
            min="0.1"
            value={round2(layer.wIn)}
            onChange={(e) => updateLayer(layer.id, { wIn: Number(e.target.value) })}
          />
        </label>
        <label>
          Height (in)
          <input
            type="number"
            step="0.05"
            min="0.1"
            value={round2(layer.hIn)}
            onChange={(e) => updateLayer(layer.id, { hIn: Number(e.target.value) })}
          />
        </label>
      </div>
      <label>
        Rotation (°)
        <input
          type="number"
          step="1"
          value={Math.round(layer.rotationDeg)}
          onChange={(e) => updateLayer(layer.id, { rotationDeg: Number(e.target.value) })}
        />
      </label>
      {layer.kind === 'capture' && (
        <label>
          Photo number
          <select
            value={layer.number}
            onChange={(e) => updateLayer(layer.id, { number: Number(e.target.value) as 1 | 2 | 3 | 4 })}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      {layer.kind === 'text' && (
        <p className="hint-small">
          Placement only: the displayed text comes from <code>pibooth.cfg</code> (
          <code>{layer.key.startsWith('footer') ? layer.key : `footer_text${layer.key}`}</code>), not the XML.
        </p>
      )}
    </section>
  );
}

export default function RightPanel() {
  return (
    <aside className="right-panel">
      <LayersPanel />
      <PropertiesPanel />
      <ExportPanel />
    </aside>
  );
}
