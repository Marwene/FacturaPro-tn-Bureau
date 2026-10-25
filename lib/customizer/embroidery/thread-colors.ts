export interface ThreadColor {
  code: string;
  name: string;
  hex: string;
  brand: string;
}

export const DMC_THREADS: ThreadColor[] = [
  { code: "DMC-310", name: "Noir", hex: "#000000", brand: "DMC" },
  { code: "DMC-5200", name: "Blanc", hex: "#FFFFFF", brand: "DMC" },
  { code: "DMC-666", name: "Rouge", hex: "#CC0000", brand: "DMC" },
  { code: "DMC-321", name: "Rouge foncé", hex: "#990000", brand: "DMC" },
  { code: "DMC-347", name: "Rouge vif", hex: "#E60000", brand: "DMC" },
  { code: "DMC-946", name: "Orange", hex: "#FF6600", brand: "DMC" },
  { code: "DMC-742", name: "Jaune clair", hex: "#FFCC00", brand: "DMC" },
  { code: "DMC-444", name: "Jaune", hex: "#FFDD00", brand: "DMC" },
  { code: "DMC-700", name: "Vert", hex: "#006600", brand: "DMC" },
  { code: "DMC-909", name: "Vert foncé", hex: "#004D00", brand: "DMC" },
  { code: "DMC-955", name: "Vert clair", hex: "#66CC66", brand: "DMC" },
  { code: "DMC-797", name: "Bleu royal", hex: "#003399", brand: "DMC" },
  { code: "DMC-311", name: "Bleu marine", hex: "#002266", brand: "DMC" },
  { code: "DMC-826", name: "Bleu ciel", hex: "#66B2FF", brand: "DMC" },
  { code: "DMC-552", name: "Violet", hex: "#660099", brand: "DMC" },
  { code: "DMC-602", name: "Rose", hex: "#FF66B2", brand: "DMC" },
  { code: "DMC-801", name: "Marron", hex: "#663300", brand: "DMC" },
  { code: "DMC-422", name: "Marron clair", hex: "#996633", brand: "DMC" },
  { code: "DMC-844", name: "Gris foncé", hex: "#555555", brand: "DMC" },
  { code: "DMC-415", name: "Gris clair", hex: "#999999", brand: "DMC" },
  { code: "DMC-762", name: "Gris perle", hex: "#CCCCCC", brand: "DMC" },
  { code: "DMC-3072", name: "Gris très clair", hex: "#E5E5E5", brand: "DMC" },
  { code: "DMC-729", name: "Or", hex: "#CC9900", brand: "DMC" },
  { code: "DMC-782", name: "Or clair", hex: "#DDBB44", brand: "DMC" },
  { code: "DMC-168", name: "Argent", hex: "#AAAAAA", brand: "DMC" },
];

export const EMBROIDERY_POSITIONS = [
  { id: "chest-left", label: "Pectoral gauche" },
  { id: "chest-right", label: "Pectoral droit" },
  { id: "chest-center", label: "Poitrine centre" },
  { id: "sleeve-left", label: "Manche gauche" },
  { id: "sleeve-right", label: "Manche droite" },
  { id: "back-center", label: "Dos centre" },
  { id: "back-collar", label: "Col arrière" },
  { id: "hat-front", label: "Devant casquette" },
  { id: "hat-back", label: "Arrière casquette" },
  { id: "apron-center", label: "Tablier centre" },
];

export const STITCH_TYPES = [
  { id: "satin" as const, label: "Satin", description: "Remplissage dense et lisse, idéal pour textes fins" },
  { id: "fill" as const, label: "Remplissage", description: "Remplissage large, idéal pour grandes surfaces" },
  { id: "run" as const, label: "Point avant", description: "Point simple, idéal pour contours" },
  { id: "tatami" as const, label: "Tatami", description: "Remplissage texturé, idéal pour grandes zones" },
  { id: "bean" as const, label: "Bean", description: "Point triple, effet épais et durable" },
];

export function getThreadColor(code: string): ThreadColor | undefined {
  return DMC_THREADS.find((t) => t.code === code);
}

export function getStitchDensityLabel(density: number): string {
  if (density >= 8) return "Très dense";
  if (density >= 5) return "Dense";
  if (density >= 3) return "Moyen";
  return "Léger";
}
