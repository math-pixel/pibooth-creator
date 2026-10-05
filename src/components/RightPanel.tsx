import { useMemo, useState } from 'react';
import { useStore, getActiveLayout } from '../store';
import type { Layer } from '../types';
import { buildTemplateXml, countEnabledLayouts, validateProject } from '../xmlExport';
import { buildProjectZip, countEmbeddedImages } from '../projectIO';
import { round2 } from '../utils';

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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportPanel() {
  const project = useStore((s) => s.project);
  const pushToast = useStore((s) => s.pushToast);
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);
  const warnings = useMemo(() => validateProject(project), [project]);
  const layoutsCount = countEnabledLayouts(project);
  const imagesCount = countEmbeddedImages(project);

  function download() {
    const xml = buildTemplateXml(project);
    downloadBlob(new Blob([xml], { type: 'application/xml' }), 'picture_template.xml');
    pushToast('picture_template.xml téléchargé', 'success');
  }

  async function copy() {
    const xml = buildTemplateXml(project);
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    pushToast('XML copié dans le presse-papiers', 'success');
    setTimeout(() => setCopied(false), 1500);
  }

  async function downloadZip() {
    setZipping(true);
    try {
      const blob = await buildProjectZip(project);
      downloadBlob(blob, `${project.name.replace(/[^a-z0-9_-]+/gi, '_') || 'pibooth-template'}.zip`);
      pushToast('Dossier projet (.zip) téléchargé', 'success');
    } finally {
      setZipping(false);
    }
  }

  return (
    <section>
      <h2>Export</h2>
      <p className="hint-small">{layoutsCount} mise(s) en page prête(s) à être exportée(s).</p>
      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <button onClick={download} disabled={layoutsCount === 0}>
        Télécharger picture_template.xml
      </button>
      <button className="secondary" onClick={copy} disabled={layoutsCount === 0}>
        {copied ? 'Copié !' : 'Copier le XML'}
      </button>
      <p className="hint-small">
        C'est le seul fichier dont pibooth a besoin — renseignez son chemin dans{' '}
        <code>PICTURE.template</code> de <code>pibooth.cfg</code>.
      </p>
      <button className="secondary" onClick={downloadZip} disabled={layoutsCount === 0 || zipping}>
        {zipping ? 'Préparation…' : `Télécharger le dossier complet (.zip, ${imagesCount} image(s))`}
      </button>
      <p className="hint-small">
        Contient le XML, chaque image source en fichier séparé, et l'état complet du projet pour le réimporter plus
        tard. Le dossier d'images n'est pas requis par pibooth (les images sont déjà intégrées dans le XML) — c'est
        une sauvegarde pratique pour vous.
      </p>
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
