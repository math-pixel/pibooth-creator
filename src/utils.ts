import type { Orientation, Project } from './types';
import { PAGE_SIZE_PRESETS } from './types';

export function getPageSizeIn(project: Project, orientation: Orientation): { widthIn: number; heightIn: number } {
  const preset = PAGE_SIZE_PRESETS.find((p) => p.id === project.pageSizeId);
  const shortIn = project.pageSizeId === 'custom' ? project.customShortIn : preset?.shortIn ?? 4;
  const longIn = project.pageSizeId === 'custom' ? project.customLongIn : preset?.longIn ?? 6;
  return orientation === 'portrait'
    ? { widthIn: shortIn, heightIn: longIn }
    : { widthIn: longIn, heightIn: shortIn };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

let idCounter = 0;
export function genId(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getImageNaturalSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
