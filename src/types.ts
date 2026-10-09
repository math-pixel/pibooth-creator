export type Orientation = 'portrait' | 'landscape';
export type CaptureCount = 1 | 2 | 3 | 4;
export type TextKey = '1' | '2' | 'footer_text1' | 'footer_text2';

export interface BaseLayer {
  id: string;
  xIn: number;
  yIn: number;
  wIn: number;
  hIn: number;
  rotationDeg: number;
}

export interface ImageLayer extends BaseLayer {
  kind: 'image';
  dataUrl: string;
  label: string;
}

export interface CaptureLayer extends BaseLayer {
  kind: 'capture';
  number: CaptureCount;
}

export interface TextLayer extends BaseLayer {
  kind: 'text';
  key: TextKey;
}

export type Layer = ImageLayer | CaptureLayer | TextLayer;

export interface Layout {
  layers: Layer[];
}

export type LayoutKey = `${CaptureCount}_${Orientation}`;

export interface PageSizePreset {
  id: string;
  label: string;
  shortIn: number;
  longIn: number;
}

export interface Project {
  name: string;
  dpi: number;
  pageSizeId: string;
  customShortIn: number;
  customLongIn: number;
  layouts: Record<LayoutKey, Layout>;
}

export function layoutKey(count: CaptureCount, orientation: Orientation): LayoutKey {
  return `${count}_${orientation}` as LayoutKey;
}

export const PAGE_SIZE_PRESETS: PageSizePreset[] = [
  { id: '4x6', label: '4 x 6 inches (classic)', shortIn: 4, longIn: 6 },
  { id: '2x6', label: '2 x 6 inches (photo strip)', shortIn: 2, longIn: 6 },
  { id: '5x7', label: '5 x 7 inches', shortIn: 5, longIn: 7 },
  { id: '6x8', label: '6 x 8 inches', shortIn: 6, longIn: 8 },
  { id: 'custom', label: 'Custom size', shortIn: 4, longIn: 6 },
];
