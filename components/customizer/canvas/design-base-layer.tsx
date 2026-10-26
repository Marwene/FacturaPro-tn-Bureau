"use client"

import { Rect, Layer, Image as KonvaImage } from "react-konva";
import type { PrintArea } from "@/lib/customizer/types/product-customizer";

interface DesignBaseLayerProps {
  mockupImage: HTMLImageElement | null;
  productImage: HTMLImageElement | null;
  canvasWidth: number;
  canvasHeight: number;
  selectedColor: string;
  safeArea?: PrintArea;
  showSafeAreas: boolean;
  printArea?: PrintArea;
  showPrintAreas: boolean;
}

export function DesignBaseLayer({
  mockupImage,
  productImage,
  canvasWidth,
  canvasHeight,
  selectedColor,
  safeArea,
  showSafeAreas,
  printArea,
  showPrintAreas,
}: DesignBaseLayerProps) {
  return (
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
      {safeArea && showSafeAreas && (
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
      {printArea && showPrintAreas && (
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
  );
}
