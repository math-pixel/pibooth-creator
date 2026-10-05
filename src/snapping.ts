import type { Layer } from './types';

export interface SnapGuide {
  orientation: 'vertical' | 'horizontal';
  posPx: number;
}

export interface SnapResult {
  xPx: number;
  yPx: number;
  guides: SnapGuide[];
}

const SNAP_THRESHOLD_PX = 6;

/**
 * Compute snapped top-left position for a shape being dragged, snapping its
 * center and edges to the page center/edges and to other shapes' centers/edges.
 * All inputs/outputs are in canvas pixels (already scaled).
 */
export function computeSnap(
  movingId: string,
  xPx: number,
  yPx: number,
  wPx: number,
  hPx: number,
  otherLayers: Layer[],
  scale: number,
  pageWidthPx: number,
  pageHeightPx: number
): SnapResult {
  const centerX = xPx + wPx / 2;
  const centerY = yPx + hPx / 2;
  const right = xPx + wPx;
  const bottom = yPx + hPx;

  const vTargets: number[] = [0, pageWidthPx / 2, pageWidthPx];
  const hTargets: number[] = [0, pageHeightPx / 2, pageHeightPx];

  otherLayers.forEach((l) => {
    if (l.id === movingId) return;
    const lx = l.xIn * scale;
    const ly = l.yIn * scale;
    const lw = l.wIn * scale;
    const lh = l.hIn * scale;
    vTargets.push(lx, lx + lw / 2, lx + lw);
    hTargets.push(ly, ly + lh / 2, ly + lh);
  });

  let bestDx = Infinity;
  let snappedX = xPx;
  let vGuide: number | null = null;
  vTargets.forEach((t) => {
    [
      { src: xPx, out: t },
      { src: centerX, out: t - wPx / 2 },
      { src: right, out: t - wPx },
    ].forEach(({ src, out }) => {
      const d = Math.abs(src - t);
      if (d <= SNAP_THRESHOLD_PX && d < bestDx) {
        bestDx = d;
        snappedX = out;
        vGuide = t;
      }
    });
  });

  let bestDy = Infinity;
  let snappedY = yPx;
  let hGuide: number | null = null;
  hTargets.forEach((t) => {
    [
      { src: yPx, out: t },
      { src: centerY, out: t - hPx / 2 },
      { src: bottom, out: t - hPx },
    ].forEach(({ src, out }) => {
      const d = Math.abs(src - t);
      if (d <= SNAP_THRESHOLD_PX && d < bestDy) {
        bestDy = d;
        snappedY = out;
        hGuide = t;
      }
    });
  });

  const guides: SnapGuide[] = [];
  if (vGuide !== null) guides.push({ orientation: 'vertical', posPx: vGuide });
  if (hGuide !== null) guides.push({ orientation: 'horizontal', posPx: hGuide });

  return { xPx: snappedX, yPx: snappedY, guides };
}
