import type { ProductSelectOption } from "./product-select"

export interface ProductSupplierOption {
  productSupplierId: string
  supplierId: string
  supplierName: string
  purchasePrice: string
  reference: string | null
  isDefault: boolean
}

export interface LineItem {
  id: string
  productId: string | null
  variantId: string | null
  description: string
  quantite: string
  prixHT?: string
  prixAchat?: string
  remise: string
  tauxTVA: string
  fodec?: boolean
  tauxFodec?: string
  totalHT: string
  productSupplierId?: string | null
  supplierName?: string | null
}

export interface ProductOption {
  id: string
  nom: string
  prixHT?: string
  prixAchat?: string
  tauxTVA: string
  fodec?: boolean
  tauxFodec?: string
  code?: string
  suppliers?: ProductSupplierOption[]
}

export interface LineItemsTableProps {
  lines: LineItem[]
  products: ProductOption[]
  currency?: string
  showFodec?: boolean
  exonereTVA?: boolean
  fieldMode?: "vente" | "achat"
  productLabel?: string
  title?: string
  addButtonLabel?: string
  onAddLine: () => void
  onRemoveLine: (id: string) => void
  onUpdateLine: (id: string, updates: Partial<LineItem>) => void
}

interface ProductSelectContext {
  priceField: "prixHT" | "prixAchat"
  fieldMode: "vente" | "achat"
  exonereTVA: boolean
}

export function buildProductSelectUpdates(
  products: ProductOption[],
  option: ProductSelectOption | null,
  context: ProductSelectContext,
): Partial<LineItem> | null {
  const { priceField, fieldMode, exonereTVA } = context

  if (!option) {
    return {
      productId: null,
      description: "",
      [priceField]: "0",
      tauxTVA: "19",
      fodec: false,
      productSupplierId: null,
      supplierName: null,
    }
  }

  const product = products.find((p) => p.id === option.id)
  if (!product) return null

  const selectedSupplier = option.supplierId
    ? product.suppliers?.find((s) => s.supplierId === option.supplierId)
    : product.suppliers?.find((s) => s.isDefault)

  const purchasePrice = selectedSupplier
    ? String(selectedSupplier.purchasePrice)
    : product.prixAchat ?? "0"

  return {
    productId: product.id,
    description: product.nom,
    [priceField]: fieldMode === "achat" ? purchasePrice : (product[priceField] ?? "0"),
    tauxTVA: exonereTVA ? "0" : product.tauxTVA,
    fodec: exonereTVA ? false : product.fodec,
    tauxFodec: product.tauxFodec,
    productSupplierId: selectedSupplier?.productSupplierId ?? null,
    supplierName: selectedSupplier?.supplierName ?? null,
  }
}
