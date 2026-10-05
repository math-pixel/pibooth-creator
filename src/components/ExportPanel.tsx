import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { buildTemplateXml, countEnabledLayouts, validateProject } from '../xmlExport';
import { buildProjectZip, countEmbeddedImages } from '../projectIO';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPanel() {
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

      <div className="export-group">
        <span className="export-group-label">Requis pour pibooth</span>
        <button className="primary" onClick={download} disabled={layoutsCount === 0}>
          Télécharger picture_template.xml
        </button>
        <button className="secondary" onClick={copy} disabled={layoutsCount === 0}>
          {copied ? 'Copié !' : 'Copier le XML'}
        </button>
      </div>
      <p className="hint-small">
        Les deux font la même chose : vous donnent le fichier à placer dans <code>PICTURE.template</code> de{' '}
        <code>pibooth.cfg</code>.
      </p>

      <div className="export-group">
        <span className="export-group-label">Optionnel</span>
        <button className="secondary" onClick={downloadZip} disabled={layoutsCount === 0 || zipping}>
          {zipping ? 'Préparation…' : `Dossier complet (.zip, ${imagesCount} image(s))`}
        </button>
      </div>
      <p className="hint-small">Sauvegarde pratique (images + projet réimportable) — pibooth n'en a pas besoin.</p>
    </section>
  );
}
