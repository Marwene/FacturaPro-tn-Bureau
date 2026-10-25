import { create } from "zustand"

export interface CustomizerProduct {
  id: string
  code: string
  nom: string
  photoUrl: string | null
  prixHT: number
  categorie?: { id: string; nom: string } | null
  tiersName?: string | null
}

export interface CustomizerVariant {
  id: string
  nom: string
  code: string | null
  attributs: Record<string, string> | null
  photoUrl: string | null
}

interface ProductStore {
  selectedProduct: CustomizerProduct | null
  selectedVariant: CustomizerVariant | null
  selectedColor: string
  selectedSize: string
  products: CustomizerProduct[]
  variants: CustomizerVariant[]

  setSelectedProduct: (product: CustomizerProduct | null) => void
  setSelectedVariant: (variant: CustomizerVariant | null) => void
  setSelectedColor: (color: string) => void
  setSelectedSize: (size: string) => void
  setProducts: (products: CustomizerProduct[]) => void
  setVariants: (variants: CustomizerVariant[]) => void
}

export const useProductStore = create<ProductStore>((set) => ({
  selectedProduct: null,
  selectedVariant: null,
  selectedColor: "#FFFFFF",
  selectedSize: "M",
  products: [],
  variants: [],

  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setSelectedVariant: (variant) => set({ selectedVariant: variant }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  setSelectedSize: (size) => set({ selectedSize: size }),
  setProducts: (products) => set({ products }),
  setVariants: (variants) => set({ variants }),
}))
