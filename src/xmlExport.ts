import type { CaptureCount, CaptureLayer, ImageLayer, Layer, Orientation, Project, TextLayer } from './types';
import { layoutKey } from './types';
import { getPageSizeIn, genId } from './utils';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toCentiInch(valueIn: number): number {
  return Math.round(valueIn * 100);
}

/** Convert a data URL (data:image/png;base64,XXXX) into the drawio-safe
 * "data:<mime>,<base64>" form (no semicolon, which would break mxCell style parsing). */
function dataUrlToStyleImage(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)(?:;base64)?,(.*)$/s);
  if (!match) return dataUrl;
  const [, mime, payload] = match;
  return `data:${mime},${payload}`;
}

function buildImageCell(layer: ImageLayer): string {
  const style = `shape=image;aspect=fixed;imageAspect=0;verticalLabelPosition=bottom;labelBackgroundColor=none;rotation=${-layer.rotationDeg};image=${dataUrlToStyleImage(
    layer.dataUrl
  )};`;
  return buildCell(layer, style, escapeXml(layer.label));
}

function buildCaptureCell(layer: CaptureLayer): string {
  const style = `rounded=0;whiteSpace=wrap;html=1;strokeColor=#000000;fillColor=#000000;fontColor=#FFFFFF;rotation=${-layer.rotationDeg};`;
  return buildCell(layer, style, String(layer.number));
}

function buildTextCell(layer: TextLayer): string {
  const style = `text;html=1;strokeColor=#000000;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;rotation=${-layer.rotationDeg};`;
  return buildCell(layer, style, layer.key);
}

function buildCell(layer: Layer, style: string, value: string): string {
  const id = escapeXml(layer.id);
  const x = toCentiInch(layer.xIn);
  const y = toCentiInch(layer.yIn);
  const w = toCentiInch(layer.wIn);
  const h = toCentiInch(layer.hIn);
  return `        <mxCell id="${id}" value="${value}" style="${escapeXml(style)}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
        </mxCell>`;
}

function buildDiagram(name: string, diagramId: string, project: Project, orientation: Orientation, layers: Layer[]): string {
  const { widthIn, heightIn } = getPageSizeIn(project, orientation);
  const pageWidth = toCentiInch(widthIn);
  const pageHeight = toCentiInch(heightIn);

  const cells = layers
    .map((layer) => {
      if (layer.kind === 'image') return buildImageCell(layer);
      if (layer.kind === 'capture') return buildCaptureCell(layer);
      return buildTextCell(layer);
    })
    .join('\n');

  return `  <diagram id="${escapeXml(diagramId)}" name="${escapeXml(name)}">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" math="0" shadow="0">
      <root>
        <mxCell id="0" dpi="${project.dpi}" />
        <mxCell id="1" parent="0" />
${cells}
      </root>
    </mxGraphModel>
  </diagram>`;
}

export function buildTemplateXml(project: Project): string {
  const diagrams: string[] = [];
  let pageNumber = 1;

  (['1', '2', '3', '4'] as const).forEach((countStr) => {
    const count = Number(countStr) as CaptureCount;
    (['portrait', 'landscape'] as Orientation[]).forEach((orientation) => {
      const layout = project.layouts[layoutKey(count, orientation)];
      if (!layout || !layout.enabled || layout.layers.length === 0) return;
      diagrams.push(
        buildDiagram(`Page-${pageNumber}`, genId('diagram'), project, orientation, layout.layers)
      );
      pageNumber += 1;
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="pibooth-creator" modified="${new Date().toISOString()}" agent="pibooth-creator" version="1.0" type="device" pages="${diagrams.length}">
${diagrams.join('\n')}
</mxfile>
`;
}

export function countEnabledLayouts(project: Project): number {
  return Object.values(project.layouts).filter((l) => l.enabled && l.layers.length > 0).length;
}

export function validateProject(project: Project): string[] {
  const warnings: string[] = [];
  (['1', '2', '3', '4'] as const).forEach((countStr) => {
    const count = Number(countStr) as CaptureCount;
    (['portrait', 'landscape'] as Orientation[]).forEach((orientation) => {
      const layout = project.layouts[layoutKey(count, orientation)];
      // Skip layouts the user never touched -- only warn about ones with actual content.
      if (!layout.enabled || layout.layers.length === 0) return;
      const captures = layout.layers.filter((l): l is CaptureLayer => l.kind === 'capture');
      const numbers = new Set(captures.map((c) => c.number));
      if (captures.length === 0) {
        warnings.push(`${count} photo(s) / ${orientation}: no photo zone defined.`);
      } else if (numbers.size !== count) {
        warnings.push(
          `${count} photo(s) / ${orientation}: needs exactly the numbers 1 to ${count} (found: ${[...numbers]
            .sort()
            .join(', ') || 'none'}).`
        );
      }
    });
  });
  return warnings;
}
