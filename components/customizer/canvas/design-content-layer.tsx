"use client"

import { Rect, Transformer, Group, Text as KonvaText, Layer } from "react-konva";
import type { RefObject } from "react";
import type Konva from "konva";
import type { DesignLayer } from "@/lib/customizer/types/product-customizer";
import { DesignTextLayer } from "./design-text-layer";
import { DesignEmbroideryLayer } from "./design-embroidery-layer";
import { DesignImageLayer } from "./design-image-layer";

interface DesignContentLayerProps {
  sortedLayers: DesignLayer[];
  activeLayerId: string | null;
  onSelect: (e: Konva.KonvaEventObject<Event>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  transformerRef: RefObject<Konva.Transformer | null>;
}

export function DesignContentLayer({
  sortedLayers,
  activeLayerId,
  onSelect,
  onDragEnd,
  onTransformEnd,
  transformerRef,
}: DesignContentLayerProps) {
  return (
    <Layer>
      {sortedLayers.filter((l) => l.visible).map((layer) => {
        if (layer.type === "text") {
          return (
            <DesignTextLayer
              key={layer.id}
              layer={layer}
              isActive={activeLayerId === layer.id}
              onSelect={onSelect}
              onDragEnd={onDragEnd}
              onTransformEnd={onTransformEnd}
            />
          );
        }

        if (layer.type === "embroidery") {
          return (
            <DesignEmbroideryLayer
              key={layer.id}
              layer={layer}
              isActive={activeLayerId === layer.id}
              onSelect={onSelect}
              onDragEnd={onDragEnd}
              onTransformEnd={onTransformEnd}
            />
          );
        }

        if (layer.type === "image" || layer.type === "logo") {
          return (
            <DesignImageLayer
              key={layer.id}
              layer={layer}
              isSelected={activeLayerId === layer.id}
              onSelect={onSelect}
              onDragEnd={onDragEnd}
              onTransformEnd={onTransformEnd}
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
            onClick={onSelect}
            onTap={onSelect}
            onDragEnd={onDragEnd}
            onTransformEnd={onTransformEnd}
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
  );
}
