"use client"

import { Rect, Group, Text as KonvaText } from "react-konva";
import type Konva from "konva";
import type { DesignLayer, TextLayerData } from "@/lib/customizer/types/product-customizer";

export function DesignTextLayer({
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
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
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
