"use client";

import { useRef, useState, forwardRef, useImperativeHandle, useLayoutEffect } from "react";
import { Stage } from "react-konva";
import type Konva from "konva";
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store";
import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { useProductStore } from "@/lib/customizer/stores/product-store";
import { getSnappedPosition } from "@/lib/customizer/canvas/konva-setup";
import { getViewConfig, PRODUCT_MOCKUP_CONFIGS } from "@/lib/customizer/mockups/product-mockups";
import { useImageLoader } from "./use-design-image-loader";
import { DesignCanvasToolbar } from "./design-toolbar";
import { DesignBaseLayer } from "./design-base-layer";
import { DesignContentLayer } from "./design-content-layer";
import type { ProductType } from "@/lib/customizer/types/product-customizer";

interface DesignCanvasProps {
  productType?: ProductType;
  productImageUrl?: string | null;
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

  // Justification useLayoutEffect : synchronisation avec un système externe non réactif — le Transformer Konva (API graphique imperative hors React, ses nœuds `#${id}` ne sont créés qu'au commit du rendu des layers). Le transformer doit être rebranché sur ces nœuds AVANT le paint (useLayoutEffect = substitute exact de la mutation de ref pendant le render qu'il remplace, désormais interdite par react-hooks/refs). deps : selectedLayerIds (la sélection pilote les nœuds attachés), layers + currentView (elles seules déterminent quels nœuds `#${id}` existent dans le stage — ajout/suppression de layer ou changement de vue doivent rebrancher le transformer ; la position/rotation ne sont pas des deps car Konva Transformer les suit lui-même).
  useLayoutEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const visibleIds = new Set(
      layers.filter((l) => !l.view || l.view === currentView).map((l) => l.id),
    );
    const transformerNodes = selectedLayerIds
      .filter((id) => visibleIds.has(id))
      .map((id) => stageRef.current?.findOne(`#${id}`))
      .filter((node): node is Konva.Node => node != null);

    transformer.nodes(transformerNodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedLayerIds, layers, currentView]);

  const sortedLayers = [...layers]
    .filter((l) => !l.view || l.view === currentView)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flex h-full flex-col">
      <DesignCanvasToolbar
        zoom={zoom}
        setZoom={setZoom}
        views={views}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

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
          <DesignBaseLayer
            mockupImage={mockupImage}
            productImage={productImage}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            selectedColor={selectedColor}
            safeArea={safeArea}
            showSafeAreas={settings.showSafeAreas}
            printArea={printArea}
            showPrintAreas={settings.showPrintAreas}
          />
          <DesignContentLayer
            sortedLayers={sortedLayers}
            activeLayerId={activeLayerId}
            onSelect={handleSelectionChange}
            onDragEnd={handleDragEnd}
            onTransformEnd={handleTransformEnd}
            transformerRef={transformerRef}
          />
        </Stage>
      </div>
    </div>
  );
});
