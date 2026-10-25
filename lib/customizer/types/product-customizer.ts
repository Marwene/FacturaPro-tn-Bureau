export type CanvasView = "front" | "back" | "left-sleeve" | "right-sleeve" | "hood" | "pocket"

export type LayerType = "product" | "image" | "logo" | "text" | "embroidery"

export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"

export type StitchType = "satin" | "fill" | "run" | "tatami" | "bean"

export type ProductType =
  | "t-shirt"
  | "hoodie"
  | "polo"
  | "sweatshirt"
  | "cap"
  | "jacket"
  | "tote-bag"
  | "mug"
  | "bottle"
  | "business-card"
  | "sticker"
  | "blouse"

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface DesignLayer {
  id: string
  type: LayerType
  name: string
  position: Position
  size: Size
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  zIndex: number
  blendMode: BlendMode
  view?: CanvasView
  data: ImageLayerData | TextLayerData | EmbroideryLayerData | ProductLayerData
}

export interface ImageLayerData {
  src: string
  originalWidth: number
  originalHeight: number
  naturalWidth?: number
}

export interface TextLayerData {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: "normal" | "italic"
  letterSpacing: number
  lineHeight: number
  textAlign: "left" | "center" | "right"
  color: string
  stroke?: string
  strokeWidth?: number
  shadow?: TextShadow
}

export interface TextShadow {
  offsetX: number
  offsetY: number
  blur: number
  color: string
}

export interface EmbroideryLayerData {
  threadColor: string
  threadBrand: string
  threadCode: string
  stitchType: StitchType
  stitchDensity: number
  underlay: boolean
  estimatedStitchCount: number
  minLineThickness: number
}

export interface ProductLayerData {
  productId: string
  variantId: string
  color: string
  size: string
  view: CanvasView
  mockupUrl: string
}

export interface ProductDesign {
  id: string
  name: string
  productId: string
  variantId: string
  companyId: string
  layers: DesignLayer[]
  thumbnailUrl?: string
  createdAt: string
  updatedAt: string
}

export interface MockupTemplate {
  id: string
  productType: ProductType
  view: CanvasView
  imageUrl: string
  printArea: PrintArea
  safeArea: PrintArea
}

export interface PrintArea {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasSettings {
  gridSize: number
  snapToGrid: boolean
  snapThreshold: number
  showGuides: boolean
  showRulers: boolean
  showSafeAreas: boolean
  showPrintAreas: boolean
}
