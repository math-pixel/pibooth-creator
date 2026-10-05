import JSZip from 'jszip';
import type { ImageLayer, Project } from './types';
import { buildTemplateXml } from './xmlExport';
import { parseTemplateXml, TemplateImportError } from './xmlImport';

const PROJECT_JSON_NAME = 'project.json';
const XML_NAME = 'picture_template.xml';

export function serializeProjectJson(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function deserializeProjectJson(json: string): Project {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.layouts) {
    throw new TemplateImportError('Invalid project.json file.');
  }
  return data as Project;
}

function extFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
  if (!match) return 'png';
  const subtype = match[1].toLowerCase();
  if (subtype === 'jpeg') return 'jpg';
  return subtype;
}

async function dataUrlToUint8Array(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Build a downloadable ZIP containing the plugin-ready XML, the full editor
 * project state (for perfect re-import), and every source image as a plain
 * file (for backup / reuse outside the app).
 */
export async function buildProjectZip(project: Project): Promise<Blob> {
  const zip = new JSZip();
  zip.file(XML_NAME, buildTemplateXml(project));
  zip.file(PROJECT_JSON_NAME, serializeProjectJson(project));

  const imagesFolder = zip.folder('images');
  let index = 0;
  for (const [key, layout] of Object.entries(project.layouts)) {
    for (const layer of layout.layers) {
      if (layer.kind !== 'image') continue;
      index += 1;
      const ext = extFromDataUrl((layer as ImageLayer).dataUrl);
      const bytes = await dataUrlToUint8Array((layer as ImageLayer).dataUrl);
      imagesFolder?.file(`${key}_${String(index).padStart(2, '0')}.${ext}`, bytes);
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

export interface ImportOutcome {
  project: Project;
  warnings: string[];
  source: 'project-json' | 'xml';
}

export async function importProjectFromFile(file: File): Promise<ImportOutcome> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const projectJsonFile = zip.file(PROJECT_JSON_NAME);
    if (projectJsonFile) {
      const text = await projectJsonFile.async('text');
      return { project: deserializeProjectJson(text), warnings: [], source: 'project-json' };
    }
    const xmlFile = zip.file(/\.xml$/i)[0];
    if (!xmlFile) {
      throw new TemplateImportError('This .zip contains neither a project.json nor a usable .xml file.');
    }
    const xmlText = await xmlFile.async('text');
    const { project, warnings } = parseTemplateXml(xmlText);
    return { project, warnings, source: 'xml' };
  }

  if (lowerName.endsWith('.json')) {
    const text = await file.text();
    return { project: deserializeProjectJson(text), warnings: [], source: 'project-json' };
  }

  if (lowerName.endsWith('.xml')) {
    const text = await file.text();
    const { project, warnings } = parseTemplateXml(text);
    return { project, warnings, source: 'xml' };
  }

  throw new TemplateImportError('Unrecognized format: use an .xml, .zip, or .json file.');
}

export function countEmbeddedImages(project: Project): number {
  let count = 0;
  Object.values(project.layouts).forEach((layout) => {
    layout.layers.forEach((l) => {
      if (l.kind === 'image') count += 1;
    });
  });
  return count;
}
