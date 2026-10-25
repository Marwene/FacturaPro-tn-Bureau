import type { StitchType } from "../types/product-customizer";

export const EMBROIDERY_CONSTRAINTS = {
  minTextSize: 8,
  minLineThickness: 2,
  maxDensity: 12,
  minDensity: 1,
  defaultDensity: 4,
  safeZoneMargin: 15,
};

export function estimateStitchCount(
  width: number,
  height: number,
  density: number,
  stitchType: StitchType,
): number {
  const area = width * height;
  const baseStitches = area * density * 0.1;

  switch (stitchType) {
    case "satin":
      return Math.round(baseStitches * 1.5);
    case "fill":
      return Math.round(baseStitches);
    case "run":
      return Math.round(Math.max(width, height) * density * 0.3);
    case "tatami":
      return Math.round(baseStitches * 2);
    case "bean":
      return Math.round(baseStitches * 1.2);
  }
}

export function estimateThreadLength(stitchCount: number): number {
  return Math.round((stitchCount * 3.5) / 100) / 10;
}

export function validateEmbroidery(
  width: number,
  height: number,
  density: number,
  stitchType: StitchType,
  minLineThickness?: number,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (width < 20 || height < 20) {
    warnings.push("Zone de broderie trop petite (min 20×20 mm)");
  }

  if (minLineThickness !== undefined && minLineThickness < EMBROIDERY_CONSTRAINTS.minLineThickness) {
    warnings.push(`Épaisseur de trait minimum : ${EMBROIDERY_CONSTRAINTS.minLineThickness} mm`);
  }

  if (density > EMBROIDERY_CONSTRAINTS.maxDensity) {
    warnings.push(`Densité trop élevée (max ${EMBROIDERY_CONSTRAINTS.maxDensity})`);
  }

  if (stitchType === "satin" && width > 80) {
    warnings.push("Le point satin est déconseillé pour les zones > 80 mm de large");
  }

  if (stitchType === "fill" && density < 3) {
    warnings.push("Densité trop faible pour un remplissage");
  }

  return { valid: warnings.length === 0, warnings };
}

export function generateStitchPattern(
  width: number,
  height: number,
  x: number,
  y: number,
  stitchType: StitchType,
  density: number,
): Array<{ x1: number; x2: number; y1: number; y2: number }> {
  const lines: Array<{ x1: number; x2: number; y1: number; y2: number }> = [];
  const spacing = Math.max(1, 10 - density);

  switch (stitchType) {
    case "satin": {
      const step = Math.max(1, spacing / 2);
      for (let i = 0; i <= height; i += step) {
        const offset = (i / height) * spacing;
        lines.push({
          x1: x + offset,
          y1: y + i,
          x2: x + width - offset,
          y2: y + i + step,
        });
      }
      break;
    }

    case "fill": {
      const step = Math.max(1, spacing);
      for (let i = 0; i <= height; i += step) {
        const offset = i % (step * 2) === 0 ? 0 : spacing / 2;
        lines.push({
          x1: x + offset,
          y1: y + i,
          x2: x + width - offset,
          y2: y + i,
        });
      }
      break;
    }

    case "run": {
      const step = Math.max(2, spacing * 2);
      for (let i = 0; i <= width; i += step) {
        lines.push({
          x1: x + i,
          y1: y,
          x2: x + i + step / 2,
          y2: y + height,
        });
      }
      break;
    }

    case "tatami": {
      const step = Math.max(1, spacing);
      for (let i = 0; i <= height; i += step) {
        const offset = i % (step * 3) === 0 ? spacing / 2 : 0;
        lines.push({
          x1: x + offset,
          y1: y + i,
          x2: x + width - offset,
          y2: y + i,
        });
      }
      for (let i = 0; i <= width; i += step) {
        const offset = i % (step * 3) === 0 ? spacing / 2 : 0;
        lines.push({
          x1: x + i,
          y1: y + offset,
          x2: x + i,
          y2: y + height - offset,
        });
      }
      break;
    }

    case "bean": {
      const step = Math.max(2, spacing);
      for (let i = 0; i <= height; i += step) {
        lines.push({
          x1: x,
          y1: y + i,
          x2: x + width,
          y2: y + i,
        });
        if (i + step / 2 <= height) {
          lines.push({
            x1: x,
            y1: y + i + step / 2,
            x2: x + width,
            y2: y + i + step / 2,
          });
        }
      }
      break;
    }
  }

  return lines;
}
