import { useEffect, useRef, useState } from 'react';
import { Stage, Layer as KonvaLayer, Rect, Image as KonvaImage, Transformer, Text, Group, Line } from 'react-konva';
import useImage from 'use-image';
import type Konva from 'konva';
import { useStore, getActiveLayout, getActiveOrientation } from '../store';
import type { Layer } from '../types';
import { getPageSizeIn } from '../utils';
import { computeSnap } from '../snapping';
import type { SnapGuide } from '../snapping';

const BOX_SIZE = 640;

interface ShapeCommonProps {
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Layer>) => void;
  onDragLive: (xPx: number, yPx: number) => SnapGuide[];
  onDragStop: () => void;
  shapeRef: (node: Konva.Node | null) => void;
}

function ImageShape({
  layer,
  scale,
  isSelected,
  onSelect,
  onChange,
  onDragLive,
  onDragStop,
  shapeRef,
}: ShapeCommonProps & { layer: Extract<Layer, { kind: 'image' }> }) {
  const [img] = useImage(layer.dataUrl);
  return (
    <KonvaImage
      ref={shapeRef as never}
      image={img}
      x={layer.xIn * scale}
      y={layer.yIn * scale}
      width={layer.wIn * scale}
      height={layer.hIn * scale}
      rotation={layer.rotationDeg}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={(e) => {
        const node = e.target;
        const guides = onDragLive(node.x(), node.y());
        void guides;
      }}
      onDragEnd={(e) => {
        onChange({ xIn: e.target.x() / scale, yIn: e.target.y() / scale });
        onDragStop();
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          xIn: node.x() / scale,
          yIn: node.y() / scale,
          wIn: (node.width() * sx) / scale,
          hIn: (node.height() * sy) / scale,
          rotationDeg: node.rotation(),
        });
      }}
      stroke={isSelected ? '#1f1f1f' : undefined}
      strokeWidth={isSelected ? 2 : 0}
    />
  );
}

function RectShape({
  layer,
  scale,
  isSelected,
  onSelect,
  onChange,
  onDragLive,
  onDragStop,
  shapeRef,
  label,
  fill,
}: ShapeCommonProps & { layer: Layer; label: string; fill: string }) {
  return (
    <Group>
      <Rect
        ref={shapeRef as never}
        x={layer.xIn * scale}
        y={layer.yIn * scale}
        width={layer.wIn * scale}
        height={layer.hIn * scale}
        rotation={layer.rotationDeg}
        fill={fill}
        stroke={isSelected ? '#1f1f1f' : '#c9c9cd'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={4}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={(e) => {
          const node = e.target;
          const guides = onDragLive(node.x(), node.y());
          void guides;
        }}
        onDragEnd={(e) => {
          onChange({ xIn: e.target.x() / scale, yIn: e.target.y() / scale });
          onDragStop();
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          const sx = node.scaleX();
          const sy = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            xIn: node.x() / scale,
            yIn: node.y() / scale,
            wIn: (node.width() * sx) / scale,
            hIn: (node.height() * sy) / scale,
            rotationDeg: node.rotation(),
          });
        }}
      />
      <Text
        x={layer.xIn * scale}
        y={layer.yIn * scale}
        width={layer.wIn * scale}
        height={layer.hIn * scale}
        align="center"
        verticalAlign="middle"
        text={label}
        fontSize={15}
        fontStyle="600"
        fill="#ffffff"
        shadowColor="#000000"
        shadowBlur={3}
        shadowOpacity={0.6}
        listening={false}
      />
    </Group>
  );
}

export default function CanvasEditor() {
  const project = useStore((s) => s.project);
  const activeOrientation = useStore(getActiveOrientation);
  const layout = useStore(getActiveLayout);
  const selectedLayerId = useStore((s) => s.selectedLayerId);
  const selectLayer = useStore((s) => s.selectLayer);
  const updateLayer = useStore((s) => s.updateLayer);
  const removeLayer = useStore((s) => s.removeLayer);

  const { widthIn, heightIn } = getPageSizeIn(project, activeOrientation);
  const scale = Math.min(BOX_SIZE / widthIn, BOX_SIZE / heightIn);
  const pageWidthPx = widthIn * scale;
  const pageHeightPx = heightIn * scale;

  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (!selectedLayerId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = nodeRefs.current.get(selectedLayerId);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedLayerId, layout?.layers]);

  // Keyboard shortcuts: Delete/Backspace removes selection, arrow keys nudge it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (!selectedLayerId || !layout) return;
      const layer = layout.layers.find((l) => l.id === selectedLayerId);
      if (!layer) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeLayer(selectedLayerId);
        return;
      }
      const step = e.shiftKey ? 0.25 : 0.02;
      if (e.key === 'ArrowLeft') updateLayer(selectedLayerId, { xIn: layer.xIn - step });
      else if (e.key === 'ArrowRight') updateLayer(selectedLayerId, { xIn: layer.xIn + step });
      else if (e.key === 'ArrowUp') updateLayer(selectedLayerId, { yIn: layer.yIn - step });
      else if (e.key === 'ArrowDown') updateLayer(selectedLayerId, { yIn: layer.yIn + step });
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedLayerId, layout, removeLayer, updateLayer]);

  if (!layout) return null;

  function handleDragLive(layerId: string, w: number, h: number, xPx: number, yPx: number): SnapGuide[] {
    const result = computeSnap(layerId, xPx, yPx, w, h, layout!.layers, scale, pageWidthPx, pageHeightPx);
    const node = nodeRefs.current.get(layerId);
    if (node) {
      node.x(result.xPx);
      node.y(result.yPx);
    }
    setGuides(result.guides);
    return result.guides;
  }

  return (
    <div className="canvas-wrap">
      <div className="canvas-page" style={{ width: pageWidthPx, height: pageHeightPx }}>
        {layout.layers.length === 0 && (
          <div className="canvas-empty-hint">
            Add a background image or a photo zone
            <br />
            from the left panel to get started.
          </div>
        )}
        <Stage
          ref={stageRef}
          width={pageWidthPx}
          height={pageHeightPx}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) selectLayer(null);
          }}
        >
          <KonvaLayer>
            <Rect x={0} y={0} width={pageWidthPx} height={pageHeightPx} fill="#ffffff" listening={false} />
            {layout.layers.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              const setRef = (node: Konva.Node | null) => {
                if (node) nodeRefs.current.set(layer.id, node);
                else nodeRefs.current.delete(layer.id);
              };
              const common = {
                scale,
                isSelected,
                onSelect: () => selectLayer(layer.id),
                onChange: (patch: Partial<Layer>) => updateLayer(layer.id, patch),
                onDragLive: (xPx: number, yPx: number) =>
                  handleDragLive(layer.id, layer.wIn * scale, layer.hIn * scale, xPx, yPx),
                onDragStop: () => setGuides([]),
                shapeRef: setRef,
              };
              if (layer.kind === 'image') {
                return <ImageShape key={layer.id} layer={layer} {...common} />;
              }
              if (layer.kind === 'capture') {
                return <RectShape key={layer.id} layer={layer} {...common} label={`Photo ${layer.number}`} fill="rgba(31, 31, 31, 0.78)" />;
              }
              return <RectShape key={layer.id} layer={layer} {...common} label={layer.key} fill="rgba(31, 31, 31, 0.45)" />;
            })}
            <Rect x={0} y={0} width={pageWidthPx} height={pageHeightPx} stroke="#c9c9cd" listening={false} />
            {guides.map((g, i) =>
              g.orientation === 'vertical' ? (
                <Line key={i} points={[g.posPx, -20, g.posPx, pageHeightPx + 20]} stroke="#1227fd" strokeWidth={1} dash={[4, 4]} listening={false} />
              ) : (
                <Line key={i} points={[-20, g.posPx, pageWidthPx + 20, g.posPx]} stroke="#1227fd" strokeWidth={1} dash={[4, 4]} listening={false} />
              )
            )}
            <Transformer
              ref={transformerRef}
              rotateEnabled
              anchorSize={9}
              borderStroke="#1f1f1f"
              anchorStroke="#1f1f1f"
              anchorFill="#ffffff"
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 10 || newBox.height < 10) return oldBox;
                return newBox;
              }}
            />
          </KonvaLayer>
        </Stage>
      </div>
      <p className="canvas-hint">
        {activeOrientation === 'portrait' ? 'Portrait' : 'Landscape'} page — {widthIn}&quot; × {heightIn}&quot;. Drag to
        move (snaps to center and edges), resize with the handles, <kbd>Delete</kbd> to remove,
        arrow keys to nudge.
      </p>
    </div>
  );
}
