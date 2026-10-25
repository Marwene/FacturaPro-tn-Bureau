import type Konva from "konva"

export const STAGE_DEFAULTS = {
  width: 800,
  height: 600,
  scaleX: 1,
  scaleY: 1,
}

export function getSnappedPosition(
  x: number,
  y: number,
  gridSize: number,
): { x: number; y: number } {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  }
}

export function createLayerId(): string {
  return crypto.randomUUID()
}

export function getCenterPosition(
  stageWidth: number,
  stageHeight: number,
  layerWidth: number,
  layerHeight: number,
): { x: number; y: number } {
  return {
    x: (stageWidth - layerWidth) / 2,
    y: (stageHeight - layerHeight) / 2,
  }
}

export function fitStageToContainer(
  stage: Konva.Stage,
  containerWidth: number,
  containerHeight: number,
): void {
  stage.width(containerWidth)
  stage.height(containerHeight)
}

export function calculateZoom(
  stageWidth: number,
  stageHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding = 40,
): number {
  const scaleX = (stageWidth - padding * 2) / contentWidth
  const scaleY = (stageHeight - padding * 2) / contentHeight
  return Math.min(scaleX, scaleY, 1)
}
