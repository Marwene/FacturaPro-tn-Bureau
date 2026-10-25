import type { CanvasView, PrintArea, ProductType } from "../types/product-customizer";

export interface MockupViewConfig {
  view: CanvasView;
  label: string;
  icon: string;
  mockupUrl?: string;
  printArea: PrintArea;
  safeArea: PrintArea;
  canvasWidth: number;
  canvasHeight: number;
}

export interface ProductMockupConfig {
  productType: ProductType;
  label: string;
  views: MockupViewConfig[];
  defaultColor: string;
  supportedColors: string[];
  hasSleeves: boolean;
  hasHood: boolean;
  hasPocket: boolean;
}

const BASE_PRINT_AREA: PrintArea = { x: 60, y: 80, width: 280, height: 340 };
const BASE_SAFE_AREA: PrintArea = { x: 80, y: 100, width: 240, height: 300 };
const CHEST_PRINT: PrintArea = { x: 100, y: 120, width: 200, height: 200 };
const SLEEVE_PRINT: PrintArea = { x: 30, y: 100, width: 100, height: 250 };

export const PRODUCT_MOCKUP_CONFIGS: Record<ProductType, ProductMockupConfig> = {
  "t-shirt": {
    productType: "t-shirt",
    label: "T-shirt",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#CC0000", "#003399", "#006600"],
    hasSleeves: true,
    hasHood: false,
    hasPocket: false,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: CHEST_PRINT,
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 400,
        canvasHeight: 500,
      },
      {
        view: "back",
        label: "Dos",
        icon: "back",
        printArea: { x: 60, y: 100, width: 280, height: 300 },
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 400,
        canvasHeight: 500,
      },
      {
        view: "left-sleeve",
        label: "Manche gauche",
        icon: "left-sleeve",
        printArea: SLEEVE_PRINT,
        safeArea: { x: 40, y: 120, width: 80, height: 210 },
        canvasWidth: 160,
        canvasHeight: 500,
      },
      {
        view: "right-sleeve",
        label: "Manche droite",
        icon: "right-sleeve",
        printArea: SLEEVE_PRINT,
        safeArea: { x: 40, y: 120, width: 80, height: 210 },
        canvasWidth: 160,
        canvasHeight: 500,
      },
    ],
  },
  hoodie: {
    productType: "hoodie",
    label: "Sweat à capuche",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#333333", "#CC0000", "#003399"],
    hasSleeves: true,
    hasHood: true,
    hasPocket: true,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: CHEST_PRINT,
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 420,
        canvasHeight: 520,
      },
      {
        view: "back",
        label: "Dos",
        icon: "back",
        printArea: { x: 60, y: 120, width: 300, height: 300 },
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 420,
        canvasHeight: 520,
      },
      {
        view: "hood",
        label: "Capuche",
        icon: "hood",
        printArea: { x: 40, y: 40, width: 200, height: 120 },
        safeArea: { x: 60, y: 60, width: 160, height: 80 },
        canvasWidth: 280,
        canvasHeight: 200,
      },
    ],
  },
  polo: {
    productType: "polo",
    label: "Polo",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#003399", "#CC0000", "#006600"],
    hasSleeves: true,
    hasHood: false,
    hasPocket: true,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: { x: 80, y: 110, width: 180, height: 180 },
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 380,
        canvasHeight: 480,
      },
      {
        view: "back",
        label: "Dos",
        icon: "back",
        printArea: { x: 60, y: 110, width: 260, height: 260 },
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 380,
        canvasHeight: 480,
      },
    ],
  },
  sweatshirt: {
    productType: "sweatshirt",
    label: "Sweat-shirt",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#333333", "#CC0000", "#003399"],
    hasSleeves: true,
    hasHood: false,
    hasPocket: true,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: CHEST_PRINT,
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 420,
        canvasHeight: 520,
      },
      {
        view: "back",
        label: "Dos",
        icon: "back",
        printArea: { x: 60, y: 120, width: 280, height: 300 },
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 420,
        canvasHeight: 520,
      },
    ],
  },
  cap: {
    productType: "cap",
    label: "Casquette",
    defaultColor: "#000000",
    supportedColors: ["#000000", "#CC0000", "#003399", "#FFFFFF", "#FF6600"],
    hasSleeves: false,
    hasHood: false,
    hasPocket: false,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: { x: 60, y: 60, width: 160, height: 80 },
        safeArea: { x: 80, y: 80, width: 120, height: 60 },
        canvasWidth: 300,
        canvasHeight: 250,
      },
      {
        view: "back",
        label: "Arrière",
        icon: "back",
        printArea: { x: 80, y: 80, width: 120, height: 60 },
        safeArea: { x: 90, y: 90, width: 100, height: 50 },
        canvasWidth: 280,
        canvasHeight: 250,
      },
    ],
  },
  jacket: {
    productType: "jacket",
    label: "Veste",
    defaultColor: "#003399",
    supportedColors: ["#003399", "#000000", "#333333", "#006600", "#CC0000"],
    hasSleeves: true,
    hasHood: false,
    hasPocket: true,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: { x: 80, y: 130, width: 240, height: 200 },
        safeArea: { x: 100, y: 150, width: 200, height: 160 },
        canvasWidth: 440,
        canvasHeight: 560,
      },
      {
        view: "back",
        label: "Dos",
        icon: "back",
        printArea: { x: 60, y: 130, width: 320, height: 320 },
        safeArea: { x: 80, y: 150, width: 280, height: 280 },
        canvasWidth: 440,
        canvasHeight: 560,
      },
      {
        view: "left-sleeve",
        label: "Manche gauche",
        icon: "left-sleeve",
        printArea: { x: 20, y: 80, width: 80, height: 280 },
        safeArea: { x: 30, y: 100, width: 60, height: 240 },
        canvasWidth: 140,
        canvasHeight: 560,
      },
      {
        view: "right-sleeve",
        label: "Manche droite",
        icon: "right-sleeve",
        printArea: { x: 20, y: 80, width: 80, height: 280 },
        safeArea: { x: 30, y: 100, width: 60, height: 240 },
        canvasWidth: 140,
        canvasHeight: 560,
      },
    ],
  },
  "tote-bag": {
    productType: "tote-bag",
    label: "Sac cabas",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#CC0000", "#003399"],
    hasSleeves: false,
    hasHood: false,
    hasPocket: false,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: { x: 40, y: 60, width: 200, height: 200 },
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 300,
        canvasHeight: 400,
      },
      {
        view: "back",
        label: "Face arrière",
        icon: "back",
        printArea: { x: 40, y: 60, width: 200, height: 200 },
        safeArea: BASE_SAFE_AREA,
        canvasWidth: 300,
        canvasHeight: 400,
      },
    ],
  },
  mug: {
    productType: "mug",
    label: "Mug",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#CC0000", "#003399"],
    hasSleeves: false,
    hasHood: false,
    hasPocket: false,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: { x: 40, y: 60, width: 160, height: 120 },
        safeArea: { x: 60, y: 80, width: 120, height: 80 },
        canvasWidth: 240,
        canvasHeight: 280,
      },
      {
        view: "back",
        label: "Face arrière",
        icon: "back",
        printArea: { x: 40, y: 60, width: 160, height: 120 },
        safeArea: { x: 60, y: 80, width: 120, height: 80 },
        canvasWidth: 240,
        canvasHeight: 280,
      },
    ],
  },
  bottle: {
    productType: "bottle",
    label: "Gourde",
    defaultColor: "#003399",
    supportedColors: ["#003399", "#CC0000", "#000000", "#FFFFFF", "#006600"],
    hasSleeves: false,
    hasHood: false,
    hasPocket: false,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "front",
        printArea: { x: 40, y: 80, width: 120, height: 160 },
        safeArea: { x: 50, y: 90, width: 100, height: 140 },
        canvasWidth: 200,
        canvasHeight: 360,
      },
    ],
  },
  "business-card": {
    productType: "business-card",
    label: "Carte de visite",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#003399", "#CC0000"],
    hasSleeves: false,
    hasHood: false,
    hasPocket: false,
    views: [
      {
        view: "front",
        label: "Recto",
        icon: "front",
        printArea: { x: 10, y: 10, width: 280, height: 180 },
        safeArea: { x: 20, y: 20, width: 260, height: 160 },
        canvasWidth: 300,
        canvasHeight: 200,
      },
      {
        view: "back",
        label: "Verso",
        icon: "back",
        printArea: { x: 10, y: 10, width: 280, height: 180 },
        safeArea: { x: 20, y: 20, width: 260, height: 160 },
        canvasWidth: 300,
        canvasHeight: 200,
      },
    ],
  },
  sticker: {
    productType: "sticker",
    label: "Autocollant",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#CC0000", "#003399", "#FFCC00"],
    hasSleeves: false,
    hasHood: false,
    hasPocket: false,
    views: [
      {
        view: "front",
        label: "Face",
        icon: "front",
        printArea: { x: 10, y: 10, width: 180, height: 180 },
        safeArea: { x: 15, y: 15, width: 170, height: 170 },
        canvasWidth: 200,
        canvasHeight: 200,
      },
    ],
  },
  blouse: {
    productType: "blouse",
    label: "Blouse",
    defaultColor: "#FFFFFF",
    supportedColors: ["#FFFFFF", "#000000", "#2D5A8E", "#8B0000", "#4A6741", "#F5F5DC"],
    hasSleeves: true,
    hasHood: false,
    hasPocket: false,
    views: [
      {
        view: "front",
        label: "Face avant",
        icon: "user",
        mockupUrl: "/modeles/blouse/devant.svg",
        printArea: { x: 50, y: 90, width: 160, height: 220 },
        safeArea: { x: 65, y: 110, width: 130, height: 180 },
        canvasWidth: 262,
        canvasHeight: 436,
      },
      {
        view: "back",
        label: "Dos",
        icon: "user",
        mockupUrl: "/modeles/blouse/derriere.svg",
        printArea: { x: 55, y: 90, width: 160, height: 220 },
        safeArea: { x: 70, y: 110, width: 130, height: 180 },
        canvasWidth: 272,
        canvasHeight: 440,
      },
    ],
  },
};

export function getMockupConfig(productType: ProductType): ProductMockupConfig {
  return PRODUCT_MOCKUP_CONFIGS[productType];
}

export function getViewConfig(
  productType: ProductType,
  view: CanvasView,
): MockupViewConfig | undefined {
  return PRODUCT_MOCKUP_CONFIGS[productType]?.views.find((v) => v.view === view);
}

export function getDefaultView(productType: ProductType): CanvasView {
  return PRODUCT_MOCKUP_CONFIGS[productType]?.views[0]?.view ?? "front";
}

const CUSTOMIZABLE_KEYWORDS = [
  "vêtement", "tenue", "travail", "uniforme", "textile",
  "vetement", "habille", "tissu", "broderie", "marquage",
  "veste", "sweat", "hoodie", "polo", "t-shirt", "tshirt",
  "casquette", "gourde", "mug", "tasse", "sac", "cabas",
  "tote", "autocollant", "sticker", "carte", "visite",
  "blouse", "pantalon", "combinaison", "gilet", "tablier",
  "chasuble", " épd", "epi", "sécurité", "haute visibilité",
];

export function isProductCustomizable(nom: string, categorieName?: string | null): boolean {
  const lookup = [nom, categorieName ?? ""].join(" ").toLowerCase();
  return CUSTOMIZABLE_KEYWORDS.some((kw) => lookup.includes(kw));
}

export function detectProductType(nom: string, categorieName?: string | null): ProductType | undefined {
  const lookup = [nom, categorieName ?? ""].join(" ").toLowerCase();

  if (lookup.includes("veste") || lookup.includes("jacket")) return "jacket";
  if (lookup.includes("blouse") || lookup.includes("chemis")) return "blouse";
  if (lookup.includes("sweat") || lookup.includes("hoodie")) return "hoodie";
  if (lookup.includes("polo")) return "polo";
  if (lookup.includes("sweatshirt") || lookup.includes("pull")) return "sweatshirt";
  if (lookup.includes("casquette") || lookup.includes("cap")) return "cap";
  if (lookup.includes("sac") || lookup.includes("tote") || lookup.includes("cabas")) return "tote-bag";
  if (lookup.includes("mug") || lookup.includes("tasse")) return "mug";
  if (lookup.includes("gourde") || lookup.includes("bottle")) return "bottle";
  if (lookup.includes("carte") || lookup.includes("visite") || lookup.includes("business")) return "business-card";
  if (lookup.includes("autocollant") || lookup.includes("sticker")) return "sticker";
  if (lookup.includes("t-shirt") || lookup.includes("tshirt") || lookup.includes("tee")) return "t-shirt";

  return undefined;
}
