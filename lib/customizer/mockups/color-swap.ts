export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  return {
    r: Number.parseInt(clean.substring(0, 2), 16),
    g: Number.parseInt(clean.substring(2, 4), 16),
    b: Number.parseInt(clean.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getContrastColor(hex: string): "#000000" | "#FFFFFF" {
  const { r, g, b } = hexToRgb(hex);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 128 ? "#000000" : "#FFFFFF";
}

export function getColorName(hex: string): string {
  const named: Record<string, string> = {
    "#FFFFFF": "Blanc",
    "#000000": "Noir",
    "#CC0000": "Rouge",
    "#FF6600": "Orange",
    "#FFCC00": "Jaune",
    "#006600": "Vert foncé",
    "#003399": "Bleu marine",
    "#330066": "Violet",
    "#663300": "Marron",
    "#999999": "Gris",
    "#333333": "Gris foncé",
    "#FFCCCC": "Rose clair",
    "#CCFFCC": "Vert clair",
    "#CCCCFF": "Bleu clair",
  };
  return named[hex.toUpperCase()] ?? hex;
}

export function applyColorOverlay(
  imageData: ImageData,
  targetColor: string,
  tolerance = 30,
): ImageData {
  const target = hexToRgb(targetColor);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (isWhiteish(r, g, b, tolerance)) {
      data[i] = target.r;
      data[i + 1] = target.g;
      data[i + 2] = target.b;
    }
  }

  return imageData;
}

function isWhiteish(r: number, g: number, b: number, tolerance: number): boolean {
  return (
    Math.abs(r - 255) < tolerance &&
    Math.abs(g - 255) < tolerance &&
    Math.abs(b - 255) < tolerance
  );
}
