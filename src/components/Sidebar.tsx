import { useRef } from 'react';
import type { CaptureCount, Orientation, Project } from '../types';
import { PAGE_SIZE_PRESETS, layoutKey } from '../types';
import { useStore, getActiveLayout, getActiveOrientation } from '../store';
import { readFileAsDataUrl } from '../utils';
import { importProjectFromFile } from '../projectIO';

const COUNTS: CaptureCount[] = [1, 2, 3, 4];

type TabStatus = 'empty' | 'partial' | 'ready';

function tabStatus(project: Project, count: CaptureCount): TabStatus {
  let best: TabStatus = 'empty';
  (['portrait', 'landscape'] as Orientation[]).forEach((o) => {
    const l = project.layouts[layoutKey(count, o)];
    if (!l.enabled || l.layers.length === 0) return;
    const captures = l.layers.filter((x) => x.kind === 'capture');
    const numbers = new Set(captures.map((c) => (c.kind === 'capture' ? c.number : 0)));
    if (numbers.size === count) best = 'ready';
    else if (best !== 'ready') best = 'partial';
  });
  return best;
}

export default function Sidebar() {
  const project = useStore((s) => s.project);
  const activeCount = useStore((s) => s.activeCount);
  const activeOrientation = useStore(getActiveOrientation);
  const layout = useStore(getActiveLayout);

  const setProjectName = useStore((s) => s.setProjectName);
  const setDpi = useStore((s) => s.setDpi);
  const setPageSizeId = useStore((s) => s.setPageSizeId);
  const setCustomSize = useStore((s) => s.setCustomSize);
  const setActiveCount = useStore((s) => s.setActiveCount);
  const setActiveOrientation = useStore((s) => s.setActiveOrientation);
  const setLayoutEnabled = useStore((s) => s.setLayoutEnabled);
  const duplicateFromPortrait = useStore((s) => s.duplicateFromPortrait);
  const addImageLayer = useStore((s) => s.addImageLayer);
  const addCaptureLayer = useStore((s) => s.addCaptureLayer);
  const addTextLayer = useStore((s) => s.addTextLayer);
  const resetProject = useStore((s) => s.resetProject);
  const loadProject = useStore((s) => s.loadProject);
  const pushToast = useStore((s) => s.pushToast);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const fgInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File | null | undefined, position: 'background' | 'foreground') {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    addImageLayer(dataUrl, file.name, position);
  }

  async function handleImport(file: File | null | undefined) {
    if (!file) return;
    try {
      const { project: imported, warnings, source } = await importProjectFromFile(file);
      const totalLayers = Object.values(imported.layouts).reduce((sum, l) => sum + l.layers.length, 0);
      if (
        warnings.length === 0 ||
        window.confirm(
          `${warnings.length} page(s) skipped or adjusted during import:\n\n${warnings.join('\n')}\n\nContinue anyway?`
        )
      ) {
        loadProject(imported);
        if (totalLayers === 0) {
          pushToast('Project imported, but it has no layers (empty file?)', 'warning');
        } else {
          pushToast(
            source === 'project-json' ? 'Project imported (full state restored)' : 'XML template imported and rebuilt',
            'success'
          );
        }
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Import failed.', 'warning');
    }
  }

  const portraitLayout = useStore((s) => s.project.layouts[`${activeCount}_portrait`]);
  const captureNumbersUsed = layout
    ? layout.layers.filter((l) => l.kind === 'capture').length
    : 0;

  return (
    <aside className="sidebar">
      <section>
        <div className="section-header-row">
          <h2>Project</h2>
          <div className="link-row">
            <button className="link-button" onClick={() => importInputRef.current?.click()}>
              Import
            </button>
            <button
              className="link-button"
              onClick={() => {
                if (window.confirm('Start a new project? Current work will be lost.')) {
                  resetProject();
                }
              }}
            >
              New project
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".xml,.zip,.json,application/xml,application/zip,application/json"
            hidden
            onChange={(e) => {
              handleImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <p className="hint-small">
          Import an existing <code>picture_template.xml</code> (even one made by hand in draw.io) or a .zip project
          exported from this app.
        </p>
        <label>
          Template name
          <input value={project.name} onChange={(e) => setProjectName(e.target.value)} />
        </label>
        <label>
          Page size
          <select value={project.pageSizeId} onChange={(e) => setPageSizeId(e.target.value)}>
            {PAGE_SIZE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {project.pageSizeId === 'custom' && (
          <div className="row">
            <label>
              Short side (in)
              <input
                type="number"
                step="0.1"
                min="1"
                value={project.customShortIn}
                onChange={(e) => setCustomSize(Number(e.target.value), project.customLongIn)}
              />
            </label>
            <label>
              Long side (in)
              <input
                type="number"
                step="0.1"
                min="1"
                value={project.customLongIn}
                onChange={(e) => setCustomSize(project.customShortIn, Number(e.target.value))}
              />
            </label>
          </div>
        )}
        <label>
          Resolution (DPI)
          <input
            type="number"
            step="50"
            min="150"
            max="1200"
            value={project.dpi}
            onChange={(e) => setDpi(Number(e.target.value))}
          />
        </label>
      </section>

      <section>
        <h2>Layout</h2>
        <div className="count-tabs">
          {COUNTS.map((c) => {
            const status = tabStatus(project, c);
            return (
              <button
                key={c}
                className={c === activeCount ? 'active' : ''}
                onClick={() => setActiveCount(c)}
              >
                <span className={`status-dot status-${status}`} />
                {c} photo{c > 1 ? 's' : ''}
              </button>
            );
          })}
        </div>
        <div className="orientation-tabs">
          {(['portrait', 'landscape'] as Orientation[]).map((o) => (
            <button
              key={o}
              className={o === activeOrientation ? 'active' : ''}
              onClick={() => setActiveOrientation(o)}
            >
              {o === 'portrait' ? 'Portrait' : 'Landscape'}
            </button>
          ))}
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={layout?.enabled ?? false}
            onChange={(e) => setLayoutEnabled(e.target.checked)}
          />
          Include this layout in the export
        </label>
        {activeOrientation === 'landscape' && portraitLayout?.layers.length > 0 && (
          <button className="secondary" onClick={duplicateFromPortrait}>
            Duplicate from portrait (rotate 90°)
          </button>
        )}
        <p className="hint-small">
          {captureNumbersUsed}/{activeCount} photo zone(s) defined for this layout.
        </p>
      </section>

      <section>
        <h2>Add elements</h2>
        <button className="primary" onClick={() => bgInputRef.current?.click()}>+ Background image</button>
        <input
          ref={bgInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleUpload(e.target.files?.[0], 'background')}
        />
        <button className="primary" onClick={addCaptureLayer} disabled={captureNumbersUsed >= activeCount}>
          + Photo zone
        </button>
        <button className="primary" onClick={() => fgInputRef.current?.click()}>+ Foreground image</button>
        <input
          ref={fgInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleUpload(e.target.files?.[0], 'foreground')}
        />
        <div className="text-buttons">
          <button className="secondary" onClick={() => addTextLayer('footer_text1')}>
            + Footer text 1
          </button>
          <button className="secondary" onClick={() => addTextLayer('footer_text2')}>
            + Footer text 2
          </button>
        </div>
        <p className="hint-small">
          These zones only define the <strong>placement</strong> of the text. The displayed content (the date, a
          message…) is set in <code>pibooth.cfg</code> (<code>[PICTURE] footer_text1</code> /{' '}
          <code>footer_text2</code>), not here — you can't put free-form text in the XML.
        </p>
      </section>
    </aside>
  );
}
