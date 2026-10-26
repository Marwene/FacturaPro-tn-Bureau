"use client"

import { useMemo } from "react";
import { Rect, Group, Line as KonvaLine } from "react-konva";
import type Konva from "konva";
import type { DesignLayer, EmbroideryLayerData } from "@/lib/customizer/types/product-customizer";
import { generateStitchPattern } from "@/lib/customizer/embroidery/stitch-engine";

export function DesignEmbroideryLayer({
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
