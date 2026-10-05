import { inflateRaw } from 'pako';
import type { CaptureCount, Layer, Orientation, Project, TextKey } from './types';
import { PAGE_SIZE_PRESETS, layoutKey } from './types';
import { createEmptyLayouts, genId, round2 } from './utils';

export class TemplateImportError extends Error {}

export interface ImportResult {
  project: Project;
  warnings: string[];
}

/** Decode a draw.io compressed <diagram> body: base64 -> raw deflate -> UTF-8 -> percent-decode. */
function inflateDiagramText(text: string): string {
  const binary = atob(text.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const inflated = inflateRaw(bytes);
  const utf8 = new TextDecoder('utf-8').decode(inflated);
  return decodeURIComponent(utf8);
}

function parseStyle(style: string): Record<string, string> {
  const dict: Record<string, string> = {};
  style
    .split(';')
    .filter((p) => p.trim().length > 0)
    .forEach((part) => {
      const eq = part.indexOf('=');
      if (eq === -1) return;
      dict[part.slice(0, eq)] = part.slice(eq + 1);
    });
  return dict;
}

/** Convert the drawio-safe "data:<mime>,<base64>" style value back into a usable data URL. */
function styleImageToDataUrl(value: string): string {
  const match = value.match(/^data:([^,]+),([\s\S]*)$/);
  if (!match) return value;
  const [, mime, payload] = match;
  const cleanMime = mime.replace(/;base64$/, '');
  return `data:${cleanMime};base64,${payload}`;
}

function extractCellValueText(rawValue: string | null): string {
  if (!rawValue) return '';
  if (!rawValue.includes('<')) return rawValue;
  try {
    const doc = new DOMParser().parseFromString(rawValue, 'text/xml');
    if (doc.querySelector('parsererror') || !doc.documentElement) return rawValue;
    return doc.documentElement.textContent || '';
  } catch {
    return rawValue;
  }
}

interface ParsedShape {
  kind: 'image' | 'capture' | 'text';
  text: string;
  xIn: number;
  yIn: number;
  wIn: number;
  hIn: number;
  rotationDeg: number;
  image?: string;
}

function parseCell(cellEl: Element): ParsedShape | null {
  if (cellEl.getAttribute('vertex') !== '1') return null;
  const styleAttr = cellEl.getAttribute('style') || '';
  const styleDict = parseStyle(styleAttr);
  const geomEl = cellEl.querySelector('mxGeometry');
  const xIn = geomEl ? Number(geomEl.getAttribute('x') || '0') / 100 : 0;
  const yIn = geomEl ? Number(geomEl.getAttribute('y') || '0') / 100 : 0;
  const wIn = geomEl ? Number(geomEl.getAttribute('width') || '0') / 100 : 0;
  const hIn = geomEl ? Number(geomEl.getAttribute('height') || '0') / 100 : 0;
  const rotationDeg = styleDict.rotation ? -Number(styleDict.rotation) : 0;
  const text = extractCellValueText(cellEl.getAttribute('value'));

  if (styleAttr.startsWith('shape=image')) {
    return { kind: 'image', text, xIn, yIn, wIn, hIn, rotationDeg, image: styleDict.image };
  }
  if (styleAttr.startsWith('text;')) {
    return { kind: 'text', text, xIn, yIn, wIn, hIn, rotationDeg };
  }
  return { kind: 'capture', text, xIn, yIn, wIn, hIn, rotationDeg };
}

/** Positive modulo (JS % can return negative for negative operands; Python's cannot). */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Mirror the plugin's own out-of-bounds auto-adjust: some real-world templates
 * stack several pages vertically/horizontally in one draw.io canvas and rely on
 * the plugin wrapping shapes back onto the physical page with a modulo.
 */
function wrapIntoPageBounds(shape: ParsedShape, widthIn: number, heightIn: number): ParsedShape {
  let { xIn, yIn } = shape;
  if (xIn + shape.wIn <= 0 || xIn >= widthIn) xIn = mod(xIn, widthIn);
  if (yIn + shape.hIn <= 0 || yIn >= heightIn) yIn = mod(yIn, heightIn);
  return { ...shape, xIn, yIn };
}

function closestPresetId(shortIn: number, longIn: number): string {
  const EPS = 0.05;
  const preset = PAGE_SIZE_PRESETS.find(
    (p) => p.id !== 'custom' && Math.abs(p.shortIn - shortIn) < EPS && Math.abs(p.longIn - longIn) < EPS
  );
  return preset?.id ?? 'custom';
}

export function parseTemplateXml(xmlText: string): ImportResult {
  const warnings: string[] = [];
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new TemplateImportError('The XML file is invalid or corrupted.');
  }

  const diagramEls = Array.from(doc.getElementsByTagName('diagram'));
  if (diagramEls.length === 0) {
    throw new TemplateImportError('No <diagram> page found in this file.');
  }

  const layouts = createEmptyLayouts();
  let dpi = 600;
  let shortIn = 4;
  let longIn = 6;
  let sizeSeen = false;

  diagramEls.forEach((diagramEl) => {
    const pageName = diagramEl.getAttribute('name') || '?';
    let graphModelEl: Element | null = diagramEl.querySelector('mxGraphModel');

    if (!graphModelEl) {
      const raw = diagramEl.textContent || '';
      if (!raw.trim()) return;
      try {
        const inflatedXml = inflateDiagramText(raw);
        const innerDoc = new DOMParser().parseFromString(inflatedXml, 'application/xml');
        graphModelEl = innerDoc.querySelector('mxGraphModel');
      } catch {
        warnings.push(`Page "${pageName}": could not decompress its content (skipped).`);
        return;
      }
    }
    if (!graphModelEl) {
      warnings.push(`Page "${pageName}": no usable content (skipped).`);
      return;
    }

    const pageWidthCin = Number(graphModelEl.getAttribute('pageWidth') || '0');
    const pageHeightCin = Number(graphModelEl.getAttribute('pageHeight') || '0');
    if (!pageWidthCin || !pageHeightCin) {
      warnings.push(`Page "${pageName}": missing page size (skipped).`);
      return;
    }
    const widthIn = pageWidthCin / 100;
    const heightIn = pageHeightCin / 100;
    const orientation: Orientation = widthIn < heightIn ? 'portrait' : 'landscape';
    if (!sizeSeen) {
      shortIn = Math.min(widthIn, heightIn);
      longIn = Math.max(widthIn, heightIn);
      sizeSeen = true;
    }

    const rootEl = graphModelEl.querySelector('root');
    if (!rootEl) return;
    const children = Array.from(rootEl.children);
    const firstDpiHolder = children[0]?.tagName === 'mxCell' ? children[0] : children[0]?.querySelector('mxCell');
    const dpiAttr = children[0]?.getAttribute('dpi') ?? firstDpiHolder?.getAttribute('dpi');
    if (dpiAttr) dpi = Number(dpiAttr) || dpi;

    const layers: Layer[] = [];
    const captureNumbers = new Set<number>();

    children.forEach((child) => {
      const cellEl = child.tagName === 'mxCell' ? child : child.querySelector('mxCell');
      if (!cellEl) return;
      const rawParsed = parseCell(cellEl);
      if (!rawParsed) return;
      const parsed = wrapIntoPageBounds(rawParsed, widthIn, heightIn);

      if (parsed.kind === 'capture') {
        const n = Number(parsed.text);
        if (n >= 1 && n <= 4) {
          captureNumbers.add(n);
          layers.push({
            id: genId('capture'),
            kind: 'capture',
            number: n as CaptureCount,
            xIn: parsed.xIn,
            yIn: parsed.yIn,
            wIn: parsed.wIn,
            hIn: parsed.hIn,
            rotationDeg: parsed.rotationDeg,
          });
        } else if (parsed.text) {
          warnings.push(`Page "${pageName}": photo zone with text "${parsed.text}" skipped (must be 1 to 4).`);
        }
      } else if (parsed.kind === 'text') {
        if (['1', '2', 'footer_text1', 'footer_text2'].includes(parsed.text)) {
          layers.push({
            id: genId('text'),
            kind: 'text',
            key: parsed.text as TextKey,
            xIn: parsed.xIn,
            yIn: parsed.yIn,
            wIn: parsed.wIn,
            hIn: parsed.hIn,
            rotationDeg: parsed.rotationDeg,
          });
        } else if (parsed.text) {
          warnings.push(`Page "${pageName}": text zone "${parsed.text}" skipped (not recognized by pibooth).`);
        }
      } else if (parsed.kind === 'image') {
        if (parsed.image) {
          layers.push({
            id: genId('image'),
            kind: 'image',
            dataUrl: styleImageToDataUrl(parsed.image),
            label: 'Imported image',
            xIn: parsed.xIn,
            yIn: parsed.yIn,
            wIn: parsed.wIn,
            hIn: parsed.hIn,
            rotationDeg: parsed.rotationDeg,
          });
        }
      }
    });

    const count = captureNumbers.size;
    if (count < 1 || count > 4) {
      warnings.push(`Page "${pageName}": ${count} distinct photo zone(s), skipped (must be between 1 and 4).`);
      return;
    }
    const key = layoutKey(count as CaptureCount, orientation);
    if (layouts[key].layers.length > 0) {
      warnings.push(`Page "${pageName}": another page already defined ${count} photo(s) / ${orientation}, this one replaced it.`);
    }
    layouts[key] = { enabled: true, layers };
  });

  const project: Project = {
    name: 'Imported template',
    dpi,
    pageSizeId: closestPresetId(round2(shortIn), round2(longIn)),
    customShortIn: round2(shortIn),
    customLongIn: round2(longIn),
    layouts,
  };

  return { project, warnings };
}
