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
  const canExport = layoutsCount > 0 && warnings.length === 0;

  function download() {
    const xml = buildTemplateXml(project);
    downloadBlob(new Blob([xml], { type: 'application/xml' }), 'picture_template.xml');
    pushToast('picture_template.xml downloaded', 'success');
  }

  async function copy() {
    const xml = buildTemplateXml(project);
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    pushToast('XML copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 1500);
  }

  async function downloadZip() {
    setZipping(true);
    try {
      const blob = await buildProjectZip(project);
      downloadBlob(blob, `${project.name.replace(/[^a-z0-9_-]+/gi, '_') || 'pibooth-template'}.zip`);
      pushToast('Project folder (.zip) downloaded', 'success');
    } finally {
      setZipping(false);
    }
  }

  return (
    <section>
      <h2>Export</h2>
      {warnings.length > 0 ? (
        <>
          <p className="hint-small export-blocked">
            Export is disabled until these are fixed — the generated file would be unsafe to use:
          </p>
          <ul className="warnings">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="hint-small">{layoutsCount} layout(s) ready to export.</p>
      )}

      <h3 className="export-subtitle">Required for pibooth</h3>
      <p className="hint-small export-description">
        This is the only file pibooth actually needs to render your layouts.
      </p>
      <div className="info-box">
        Place <code>picture_template.xml</code> anywhere on the Raspberry Pi, then point to it from{' '}
        <code>pibooth.cfg</code>:
        <pre>
          [PICTURE]{'\n'}
          template = /path/to/picture_template.xml
        </pre>
      </div>
      <button className="primary" onClick={download} disabled={!canExport}>
        Download picture_template.xml
      </button>
      <button className="secondary" onClick={copy} disabled={!canExport}>
        {copied ? 'Copied!' : 'Copy XML'}
      </button>

      <h3 className="export-subtitle">Optional</h3>
      <p className="hint-small">
        Handy backup (images + a reimportable project) — useful if you want to share your work with someone else.
      </p>
      <button className="secondary" onClick={downloadZip} disabled={!canExport || zipping}>
        {zipping ? 'Preparing…' : `Full folder (.zip, ${imagesCount} image(s))`}
      </button>
    </section>
  );
}
