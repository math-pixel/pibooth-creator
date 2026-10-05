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
      <h2>Calques (haut → bas)</h2>
      {ordered.length === 0 && <p className="hint-small">Aucun élément. Ajoutez une image ou une zone photo.</p>}
      <ul className="layers-list">
        {ordered.map((layer) => (
          <li key={layer.id} className={layer.id === selectedLayerId ? 'selected' : ''}>
            <button className="layer-row" onClick={() => selectLayer(layer.id)}>
              {layerLabel(layer)}
            </button>
            <div className="layer-actions">
              <button title="Monter" onClick={() => moveLayer(layer.id, 'up')}>
                ↑
              </button>
              <button title="Descendre" onClick={() => moveLayer(layer.id, 'down')}>
                ↓
              </button>
              <button title="Supprimer" onClick={() => removeLayer(layer.id)}>
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
        <h2>Propriétés</h2>
        <p className="hint-small">Sélectionnez un élément sur le canevas pour voir ses propriétés.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Propriétés</h2>
      <div className="row">
        <label>
          X (po)
          <input
            type="number"
            step="0.05"
            value={round2(layer.xIn)}
            onChange={(e) => updateLayer(layer.id, { xIn: Number(e.target.value) })}
          />
        </label>
        <label>
          Y (po)
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
          Largeur (po)
          <input
            type="number"
            step="0.05"
            min="0.1"
            value={round2(layer.wIn)}
            onChange={(e) => updateLayer(layer.id, { wIn: Number(e.target.value) })}
          />
        </label>
        <label>
          Hauteur (po)
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
          Numéro de la photo
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
          Emplacement uniquement : le texte affiché vient de <code>pibooth.cfg</code> (
          <code>{layer.key.startsWith('footer') ? layer.key : `footer_text${layer.key}`}</code>), pas du XML.
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
