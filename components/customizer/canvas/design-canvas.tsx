"use client";

import { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Rect, Transformer, Image as KonvaImage, Text as KonvaText, Group, Line as KonvaLine } from "react-konva";
import type Konva from "konva";
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store";
import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { useProductStore } from "@/lib/customizer/stores/product-store";
import { getSnappedPosition } from "@/lib/customizer/canvas/konva-setup";
import { getViewConfig, PRODUCT_MOCKUP_CONFIGS } from "@/lib/customizer/mockups/product-mockups";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Grid3X3 } from "lucide-react";
import type { ProductType, DesignLayer, TextLayerData, ImageLayerData, EmbroideryLayerData } from "@/lib/customizer/types/product-customizer";
import { generateStitchPattern } from "@/lib/customizer/embroidery/stitch-engine";

interface DesignCanvasProps {
  productType?: ProductType;
  productImageUrl?: string | null;
}

function useImageLoader(src: string | null | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Justification useEffect : API navigateur HTMLImageElement (new window.Image) — décodage asynchrone de l'image vers l'état via onload/onerror, callbacks externes au React (non réactif : onload survient hors cycle React, impossible à produire pendant un rendu).
  useEffect(() => {
    if (!src) { setImage(null); return }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
    return () => { img.onload = null; img.onerror = null };
  }, [src]);

  return image;
}

function ImageLayerComponent({
  layer,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  layer: DesignLayer;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<Event>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}) {
  const imgData = layer.data as ImageLayerData;
  const htmlImage = useImageLoader(imgData.src);

  return (
    <Group
      id={layer.id}
      x={layer.position.x}
      y={layer.position.y}
      rotation={layer.rotation}
      opacity={layer.opacity}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      {htmlImage ? (
        <KonvaImage
          image={htmlImage}
          width={layer.size.width}
          height={layer.size.height}
        />
      ) : (
        <Rect
          width={layer.size.width}
          height={layer.size.height}
          fill="#e5e5e5"
          stroke="#999"
          strokeWidth={1}
          dash={[4, 4]}
        />
      )}
      {isSelected && (
        <Rect
          width={layer.size.width}
          height={layer.size.height}
          stroke="#3b82f6"
          strokeWidth={1}
          fill="transparent"
          listening={false}
        />
      )}
    </Group>
  );
}

function EmbroideryLayer({
  layer,
  isActive,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  layer: DesignLayer;
  isActive: boolean;
  onSelect: (e: Konva.KonvaEventObject<Event>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}) {
  const ed = layer.data as EmbroideryLayerData;
  const stitches = useMemo(
    () => generateStitchPattern(
      layer.size.width,
      layer.size.height,
      0,
      0,
      ed.stitchType,
      ed.stitchDensity,
    ),
    [layer.size.width, layer.size.height, ed.stitchType, ed.stitchDensity],
  );

  return (
    <Group
      key={layer.id}
      id={layer.id}
      x={layer.position.x}
      y={layer.position.y}
      rotation={layer.rotation}
      opacity={layer.opacity}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <Rect
        x={-2}
        y={-2}
        width={layer.size.width + 4}
        height={layer.size.height + 4}
        fill={ed.threadColor}
        opacity={0.08}
        cornerRadius={2}
      />
      {stitches.slice(0, 200).map((s, i) => (
        <KonvaLine
          key={i}
          points={[s.x1, s.y1, s.x2, s.y2]}
          stroke={ed.threadColor}
          strokeWidth={1.2}
          opacity={0.6}
          listening={false}
        />
      ))}
      {isActive && (
        <Rect
          width={layer.size.width}
          height={layer.size.height}
          stroke="#3b82f6"
          strokeWidth={1}
          fill="transparent"
          listening={false}
        />
      )}
    </Group>
  );
}

export interface DesignCanvasHandle {
  getStage: () => Konva.Stage | null;
  getCanvasSnapshot: () => HTMLCanvasElement | null;
}

export const DesignCanvas = forwardRef<DesignCanvasHandle, DesignCanvasProps>(
  function DesignCanvas({ productType = "t-shirt", productImageUrl }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const zoom = useCanvasStore((s) => s.zoom);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const panX = useCanvasStore((s) => s.panX);
  const panY = useCanvasStore((s) => s.panY);
  const setPan = useCanvasStore((s) => s.setPan);
  const selectedLayerIds = useCanvasStore((s) => s.selectedLayerIds);
  const setSelectedLayerIds = useCanvasStore((s) => s.setSelectedLayerIds);
  const settings = useCanvasStore((s) => s.settings);
  const currentView = useCanvasStore((s) => s.currentView);
  const setCurrentView = useCanvasStore((s) => s.setCurrentView);
  const layers = useLayerStore((s) => s.layers);
  const activeLayerId = useLayerStore((s) => s.activeLayerId);
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer);
  const updateLayer = useLayerStore((s) => s.updateLayer);
  const selectedColor = useProductStore((s) => s.selectedColor);

  const [isPanning] = useState(false);
  const productImage = useImageLoader(productImageUrl);

  const viewConfig = getViewConfig(productType, currentView);
  const canvasWidth = viewConfig?.canvasWidth ?? 400;
  const canvasHeight = viewConfig?.canvasHeight ?? 500;
  const printArea = viewConfig?.printArea;
  const safeArea = viewConfig?.safeArea;
  const mockupImage = useImageLoader(viewConfig?.mockupUrl ?? null);

  const views = PRODUCT_MOCKUP_CONFIGS[productType]?.views ?? [];

  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    getCanvasSnapshot: () => {
      if (!stageRef.current) return null;
      return stageRef.current.toCanvas({ pixelRatio: 2 });
    },
  }), []);

  function handleStageClick(e: Konva.KonvaEventObject<Event>) {
    if (e.target === e.target.getStage()) {
      setActiveLayer(null);
      setSelectedLayerIds([]);
    }
  }

  function handleSelectionChange(e: Konva.KonvaEventObject<Event>) {
    const clickedOnTransformer = e.target.getParent()?.name() === "transformer";
    if (clickedOnTransformer) return;

    const target = e.target.findAncestor("Group");
    if (!target) {
      setActiveLayer(null);
      setSelectedLayerIds([]);
      return;
    }

    const layerId = target.id();
    const nativeEvent = e.evt as MouseEvent;
    if (nativeEvent.shiftKey) {
      const isSelected = selectedLayerIds.includes(layerId);
      setSelectedLayerIds(
        isSelected
          ? selectedLayerIds.filter((id) => id !== layerId)
          : [...selectedLayerIds, layerId],
      );
    } else {
      setActiveLayer(layerId);
      setSelectedLayerIds([layerId]);
    }
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const layerId = node.id();
    if (!layerId) return;

    const x = settings.snapToGrid
      ? getSnappedPosition(node.x(), node.y(), settings.gridSize).x
      : node.x();
    const y = settings.snapToGrid
      ? getSnappedPosition(node.x(), node.y(), settings.gridSize).y
      : node.y();

    updateLayer(layerId, {
      position: { x, y },
      size: { width: node.width() * node.scaleX(), height: node.height() * node.scaleY() },
      rotation: node.rotation(),
    });

    node.position({ x, y });
    node.scaleX(1);
    node.scaleY(1);
  }

  function handleTransformEnd(e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    const layerId = node.id();
    if (!layerId) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    updateLayer(layerId, {
      position: { x: node.x(), y: node.y() },
      size: {
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
      },
      rotation: node.rotation(),
    });

    node.scaleX(1);
    node.scaleY(1);
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    const nativeEvent = e.evt;
    nativeEvent.preventDefault();
    const scaleBy = 1.08;
    const newZoom = nativeEvent.deltaY > 0 ? zoom / scaleBy : zoom * scaleBy;
    setZoom(newZoom);
  }

  const transformerNodes = selectedLayerIds
    .map((id) => stageRef.current?.findOne(`#${id}`))
    .filter(Boolean) as Konva.Node[];

  if (transformerRef.current && transformerNodes.length > 0) {
    transformerRef.current.nodes(transformerNodes);
    transformerRef.current.getLayer()?.batchDraw();
  } else if (transformerRef.current) {
    transformerRef.current.nodes([]);
    transformerRef.current.getLayer()?.batchDraw();
  }

  const sortedLayers = [...layers]
    .filter((l) => !l.view || l.view === currentView)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(zoom * 1.2)}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(zoom / 1.2)}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Grid3X3 className="h-3.5 w-3.5" />
          </Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
            {views.map((v) => (
              <button
                key={v.view}
                type="button"
                onClick={() => setCurrentView(v.view)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  currentView === v.view
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        style={{
          backgroundImage: "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%)",
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 10px 10px",
        }}
      >
        <Stage
          ref={stageRef}
          width={containerRef.current?.clientWidth ?? 800}
          height={containerRef.current?.clientHeight ?? 600}
          scaleX={zoom}
          scaleY={zoom}
          x={panX}
          y={panY}
          draggable={isPanning}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleSelectionChange}
          onWheel={handleWheel}
          onDragEnd={(e) => { if (isPanning) setPan(e.target.x(), e.target.y()) }}
        >
          <Layer>
            {mockupImage ? (
              <KonvaImage
                image={mockupImage}
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                listening={false}
              />
            ) : (
              <>
                <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill={selectedColor} />
                {productImage && (
                  <KonvaImage
                    image={productImage}
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    listening={false}
                    opacity={0.85}
                  />
                )}
              </>
            )}
            {safeArea && settings.showSafeAreas && (
              <Rect
                x={safeArea.x}
                y={safeArea.y}
                width={safeArea.width}
                height={safeArea.height}
                stroke="#22c55e"
                strokeWidth={1}
                dash={[5, 5]}
                listening={false}
                opacity={0.4}
              />
            )}
            {printArea && settings.showPrintAreas && (
              <Rect
                x={printArea.x}
                y={printArea.y}
                width={printArea.width}
                height={printArea.height}
                stroke="#3b82f6"
                strokeWidth={1}
                dash={[3, 3]}
                listening={false}
                opacity={0.4}
              />
            )}
          </Layer>

          <Layer>
            {sortedLayers.filter((l) => l.visible).map((layer) => {
              if (layer.type === "text") {
                const td = layer.data as TextLayerData;
                return (
                  <Group
                    key={layer.id}
                    id={layer.id}
                    x={layer.position.x}
                    y={layer.position.y}
                    rotation={layer.rotation}
                    opacity={layer.opacity}
                    draggable={!layer.locked}
                    onClick={handleSelectionChange}
                    onTap={handleSelectionChange}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                  >
                    <KonvaText
                      text={td.text}
                      fontFamily={td.fontFamily}
                      fontSize={td.fontSize}
                      fontStyle={`${td.fontWeight >= 700 ? "bold " : ""}${td.fontStyle}`}
                      fill={td.color}
                      align={td.textAlign}
                      letterSpacing={td.letterSpacing}
                      lineHeight={td.lineHeight}
                      width={layer.size.width}
                      height={layer.size.height}
                      wrap="word"
                    />
                    {activeLayerId === layer.id && (
                      <Rect
                        width={layer.size.width}
                        height={layer.size.height}
                        stroke="#3b82f6"
                        strokeWidth={1}
                        fill="transparent"
                        listening={false}
                      />
                    )}
                  </Group>
                );
              }

              if (layer.type === "embroidery") {
                return (
                  <EmbroideryLayer
                    key={layer.id}
                    layer={layer}
                    isActive={activeLayerId === layer.id}
                    onSelect={handleSelectionChange}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                  />
                );
              }

              if (layer.type === "image" || layer.type === "logo") {
                return (
                  <ImageLayerComponent
                    key={layer.id}
                    layer={layer}
                    isSelected={activeLayerId === layer.id}
                    onSelect={handleSelectionChange}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                  />
                );
              }

              return (
                <Group
                  key={layer.id}
                  id={layer.id}
                  x={layer.position.x}
                  y={layer.position.y}
                  width={layer.size.width}
                  height={layer.size.height}
                  rotation={layer.rotation}
                  opacity={layer.opacity}
                  draggable={!layer.locked}
                  onClick={handleSelectionChange}
                  onTap={handleSelectionChange}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                >
                  <Rect
                    width={layer.size.width}
                    height={layer.size.height}
                    fill="rgba(200,200,200,0.3)"
                    stroke={activeLayerId === layer.id ? "#3b82f6" : "transparent"}
                    strokeWidth={1}
                    cornerRadius={2}
                  />
                  <KonvaText x={4} y={4} text={layer.name} fontSize={12} fill="#666" />
                </Group>
              );
            })}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
});
