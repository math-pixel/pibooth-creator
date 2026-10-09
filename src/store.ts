import { create } from 'zustand';
import type {
  CaptureCount,
  CaptureLayer,
  ImageLayer,
  Layer,
  Orientation,
  Project,
  TextKey,
  TextLayer,
} from './types';
import { layoutKey } from './types';
import { createEmptyLayouts, genId, getPageSizeIn } from './utils';

function defaultProject(): Project {
  return {
    name: 'My pibooth template',
    dpi: 600,
    pageSizeId: '4x6',
    customShortIn: 4,
    customLongIn: 6,
    layouts: createEmptyLayouts(),
  };
}

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
}

type OrientationByCount = Record<CaptureCount, Orientation>;

interface EditorState {
  project: Project;
  activeCount: CaptureCount;
  /** Which orientation tab is active, remembered independently per photo count
   * (e.g. "1 photo" can stay on portrait while "4 photos" stays on landscape). */
  orientationByCount: OrientationByCount;
  selectedLayerId: string | null;
  toasts: Toast[];
  pushToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;

  setActiveCount: (count: CaptureCount) => void;
  setActiveOrientation: (orientation: Orientation) => void;
  selectLayer: (id: string | null) => void;

  setProjectName: (name: string) => void;
  setDpi: (dpi: number) => void;
  setPageSizeId: (id: string) => void;
  setCustomSize: (shortIn: number, longIn: number) => void;

  setLayoutEnabled: (enabled: boolean) => void;
  duplicateFromPortrait: () => void;

  addImageLayer: (dataUrl: string, label: string, position: 'background' | 'foreground') => void;
  addCaptureLayer: () => void;
  addTextLayer: (key: TextKey) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;

  loadProject: (project: Project) => void;
  resetProject: () => void;

  past: Project[];
  future: Project[];
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 100;

function defaultOrientationByCount(): OrientationByCount {
  return { 1: 'portrait', 2: 'portrait', 3: 'portrait', 4: 'portrait' };
}

export const useStore = create<EditorState>((set, get) => ({
  project: defaultProject(),
  activeCount: 1,
  orientationByCount: defaultOrientationByCount(),
  selectedLayerId: null,
  toasts: [],
  past: [],
  future: [],

  pushToast: (message, tone = 'info') =>
    set((s) => ({ toasts: [...s.toasts, { id: genId('toast'), message, tone }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setActiveCount: (count) => set({ activeCount: count, selectedLayerId: null }),
  setActiveOrientation: (orientation) =>
    set((s) => ({
      orientationByCount: { ...s.orientationByCount, [s.activeCount]: orientation },
      selectedLayerId: null,
    })),
  selectLayer: (id) => set({ selectedLayerId: id }),

  setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),
  setDpi: (dpi) => set((s) => ({ project: { ...s.project, dpi } })),
  setPageSizeId: (id) => set((s) => ({ project: { ...s.project, pageSizeId: id } })),
  setCustomSize: (shortIn, longIn) =>
    set((s) => ({ project: { ...s.project, customShortIn: shortIn, customLongIn: longIn } })),

  setLayoutEnabled: (enabled) =>
    set((s) => {
      const key = layoutKey(s.activeCount, s.orientationByCount[s.activeCount]);
      const layouts = { ...s.project.layouts };
      layouts[key] = { ...layouts[key], enabled };
      return { project: { ...s.project, layouts } };
    }),

  duplicateFromPortrait: () =>
    set((s) => {
      const srcKey = layoutKey(s.activeCount, 'portrait');
      const dstKey = layoutKey(s.activeCount, 'landscape');
      const src = s.project.layouts[srcKey];
      const srcSize = getPageSizeIn(s.project, 'portrait');
      const dstSize = getPageSizeIn(s.project, 'landscape');
      // Rotate 90°: new_x = old_y, new_y = old_x (axes swap), scaled to new page size
      const layers: Layer[] = src.layers.map((l) => {
        const nx = (l.yIn / srcSize.heightIn) * dstSize.widthIn;
        const ny = (l.xIn / srcSize.widthIn) * dstSize.heightIn;
        const nw = (l.hIn / srcSize.heightIn) * dstSize.widthIn;
        const nh = (l.wIn / srcSize.widthIn) * dstSize.heightIn;
        return { ...l, id: genId(l.kind), xIn: nx, yIn: ny, wIn: nw, hIn: nh };
      });
      const layouts = { ...s.project.layouts };
      layouts[dstKey] = { enabled: true, layers };
      return {
        project: { ...s.project, layouts },
        orientationByCount: { ...s.orientationByCount, [s.activeCount]: 'landscape' as Orientation },
        toasts: [
          ...s.toasts,
          { id: genId('toast'), message: 'Landscape layout generated from portrait', tone: 'success' as const },
        ],
      };
    }),

  addImageLayer: (dataUrl, label, position) =>
    set((s) => {
      const orientation = s.orientationByCount[s.activeCount];
      const key = layoutKey(s.activeCount, orientation);
      const size = getPageSizeIn(s.project, orientation);
      const layer: ImageLayer = {
        id: genId('image'),
        kind: 'image',
        dataUrl,
        label,
        xIn: 0,
        yIn: 0,
        wIn: size.widthIn,
        hIn: size.heightIn,
        rotationDeg: 0,
      };
      const layouts = { ...s.project.layouts };
      const layout = layouts[key];
      const newLayers =
        position === 'background' ? [layer, ...layout.layers] : [...layout.layers, layer];
      layouts[key] = { ...layout, layers: newLayers };
      const toastMsg = position === 'background' ? 'Background image added' : 'Foreground image added';
      return {
        project: { ...s.project, layouts },
        selectedLayerId: layer.id,
        toasts: [...s.toasts, { id: genId('toast'), message: toastMsg, tone: 'success' as const }],
      };
    }),

  addCaptureLayer: () =>
    set((s) => {
      const orientation = s.orientationByCount[s.activeCount];
      const key = layoutKey(s.activeCount, orientation);
      const layout = s.project.layouts[key];
      const size = getPageSizeIn(s.project, orientation);
      const existingNumbers = new Set(
        layout.layers.filter((l): l is CaptureLayer => l.kind === 'capture').map((l) => l.number)
      );
      let number: CaptureCount = 1;
      for (let n = 1; n <= s.activeCount; n += 1) {
        if (!existingNumbers.has(n as CaptureCount)) {
          number = n as CaptureCount;
          break;
        }
      }
      const margin = size.widthIn * 0.1;
      const layer: CaptureLayer = {
        id: genId('capture'),
        kind: 'capture',
        number,
        xIn: margin,
        yIn: margin,
        wIn: size.widthIn - margin * 2,
        hIn: (size.heightIn - margin * 2) / s.activeCount,
        rotationDeg: 0,
      };
      // Find capture layers to insert after (keep images-before-captures-before-overlays convention loosely)
      const layouts = { ...s.project.layouts };
      layouts[key] = { ...layout, layers: [...layout.layers, layer] };
      return { project: { ...s.project, layouts }, selectedLayerId: layer.id };
    }),

  addTextLayer: (key: TextKey) =>
    set((s) => {
      const orientation = s.orientationByCount[s.activeCount];
      const lk = layoutKey(s.activeCount, orientation);
      const layout = s.project.layouts[lk];
      const size = getPageSizeIn(s.project, orientation);
      const layer: TextLayer = {
        id: genId('text'),
        kind: 'text',
        key,
        xIn: size.widthIn * 0.1,
        yIn: size.heightIn * 0.85,
        wIn: size.widthIn * 0.8,
        hIn: size.heightIn * 0.08,
        rotationDeg: 0,
      };
      const layouts = { ...s.project.layouts };
      layouts[lk] = { ...layout, layers: [...layout.layers, layer] };
      return { project: { ...s.project, layouts }, selectedLayerId: layer.id };
    }),

  updateLayer: (id, patch) =>
    set((s) => {
      const key = layoutKey(s.activeCount, s.orientationByCount[s.activeCount]);
      const layout = s.project.layouts[key];
      const layers = layout.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l));
      const layouts = { ...s.project.layouts, [key]: { ...layout, layers } };
      return { project: { ...s.project, layouts } };
    }),

  removeLayer: (id) =>
    set((s) => {
      const key = layoutKey(s.activeCount, s.orientationByCount[s.activeCount]);
      const layout = s.project.layouts[key];
      const layers = layout.layers.filter((l) => l.id !== id);
      const layouts = { ...s.project.layouts, [key]: { ...layout, layers } };
      return {
        project: { ...s.project, layouts },
        selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
      };
    }),

  moveLayer: (id, direction) =>
    set((s) => {
      const key = layoutKey(s.activeCount, s.orientationByCount[s.activeCount]);
      const layout = s.project.layouts[key];
      const idx = layout.layers.findIndex((l) => l.id === id);
      if (idx === -1) return s;
      const swapWith = direction === 'up' ? idx + 1 : idx - 1;
      if (swapWith < 0 || swapWith >= layout.layers.length) return s;
      const layers = [...layout.layers];
      [layers[idx], layers[swapWith]] = [layers[swapWith], layers[idx]];
      const layouts = { ...s.project.layouts, [key]: { ...layout, layers } };
      return { project: { ...s.project, layouts } };
    }),

  loadProject: (project) =>
    set((s) => {
      let activeCount: CaptureCount = 1;
      let foundOrientation: Orientation = 'portrait';
      let found = false;
      for (const count of [1, 2, 3, 4] as CaptureCount[]) {
        for (const orientation of ['portrait', 'landscape'] as Orientation[]) {
          if (project.layouts[layoutKey(count, orientation)]?.layers.length > 0) {
            activeCount = count;
            foundOrientation = orientation;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      // Remember each count's own orientation based on what the imported project actually has,
      // instead of forcing every tab back to portrait.
      const orientationByCount = { ...s.orientationByCount };
      ([1, 2, 3, 4] as CaptureCount[]).forEach((count) => {
        if (project.layouts[layoutKey(count, 'landscape')]?.layers.length > 0 && !(project.layouts[layoutKey(count, 'portrait')]?.layers.length > 0)) {
          orientationByCount[count] = 'landscape';
        }
      });
      orientationByCount[activeCount] = foundOrientation;
      return { project, selectedLayerId: null, activeCount, orientationByCount };
    }),
  resetProject: () => set({ project: defaultProject(), selectedLayerId: null, orientationByCount: defaultOrientationByCount() }),

  undo: () => {
    flushHistoryBurst();
    const { past, future, project } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    isTimeTraveling = true;
    set({ project: previous, past: past.slice(0, -1), future: [project, ...future], selectedLayerId: null });
    isTimeTraveling = false;
  },
  redo: () => {
    flushHistoryBurst();
    const { past, future, project } = get();
    if (future.length === 0) return;
    const next = future[0];
    isTimeTraveling = true;
    set({ project: next, past: [...past, project], future: future.slice(1), selectedLayerId: null });
    isTimeTraveling = false;
  },
}));

export function getActiveOrientation(state: EditorState): Orientation {
  return state.orientationByCount[state.activeCount];
}

export function getActiveLayout(state: EditorState) {
  return state.project.layouts[layoutKey(state.activeCount, getActiveOrientation(state))];
}

// --- Undo/redo history tracking ---------------------------------------
// Rapid-fire changes (typing in a number field, dragging) are coalesced into
// a single history entry by waiting for a short pause before committing.
let isTimeTraveling = false;
let burstStartProject: Project | null = null;
let burstTimer: ReturnType<typeof setTimeout> | null = null;

function flushHistoryBurst() {
  if (burstTimer) clearTimeout(burstTimer);
  burstTimer = null;
  if (burstStartProject) {
    const captured = burstStartProject;
    burstStartProject = null;
    useStore.setState((s) => ({ past: [...s.past, captured].slice(-MAX_HISTORY), future: [] }));
  }
}

useStore.subscribe((state, prevState) => {
  if (isTimeTraveling || state.project === prevState.project) return;
  if (burstStartProject === null) burstStartProject = prevState.project;
  if (burstTimer) clearTimeout(burstTimer);
  burstTimer = setTimeout(flushHistoryBurst, 500);
});
