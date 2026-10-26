"use client"

import { Rect, Group, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type { DesignLayer, ImageLayerData } from "@/lib/customizer/types/product-customizer";
import { useImageLoader } from "./use-design-image-loader";

export function DesignImageLayer({
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
