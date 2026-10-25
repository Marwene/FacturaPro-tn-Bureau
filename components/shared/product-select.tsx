"use client"

import { useState, useRef, useCallback } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatTND } from "@/lib/decimal"

export interface ProductSelectOption {
  key: string
  id: string
  code?: string
  nom: string
  prixHT?: string
  prixAchat?: string
  tauxTVA: string
  fodec?: boolean
  tauxFodec?: string
  supplierName?: string
  supplierId?: string
  purchasePrice?: string
  productSupplierId?: string
}

export interface ProductSelectProps {
  selectedProductId: string | null
  selectedSupplierId?: string | null
  options: ProductSelectOption[]
  fieldMode?: "vente" | "achat"
  onSelect: (option: ProductSelectOption | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function buildProductSelectOptions(
  products: Array<{
    id: string
    code?: string
    nom: string
    prixHT?: string
    prixAchat?: string
    tauxTVA: string
    fodec?: boolean
    tauxFodec?: string
    suppliers?: Array<{
      supplierName: string
      supplierId: string
      purchasePrice: string | number
      productSupplierId: string
      isDefault?: boolean
    }>
  }>
): ProductSelectOption[] {
  const options: ProductSelectOption[] = []
  for (const p of products) {
    if (p.suppliers && p.suppliers.length > 0) {
      for (const s of p.suppliers) {
        options.push({
          key: `${p.id}-${s.supplierId}`,
          id: p.id,
          code: p.code,
          nom: p.nom,
          prixHT: p.prixHT,
          prixAchat: p.prixAchat,
          tauxTVA: p.tauxTVA,
          fodec: p.fodec,
          tauxFodec: p.tauxFodec,
          supplierName: s.supplierName,
          supplierId: s.supplierId,
          purchasePrice: String(s.purchasePrice),
          productSupplierId: s.productSupplierId,
        })
      }
    } else {
      options.push({
        key: p.id,
        id: p.id,
        code: p.code,
        nom: p.nom,
        prixHT: p.prixHT,
        prixAchat: p.prixAchat,
        tauxTVA: p.tauxTVA,
        fodec: p.fodec,
        tauxFodec: p.tauxFodec,
      })
    }
  }
  return options
}

export function ProductSelect({
  selectedProductId,
  selectedSupplierId = null,
  options,
  fieldMode = "vente",
  onSelect,
  placeholder = "Sélectionner",
  className,
  disabled = false,
}: ProductSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? options.filter((opt) => {
        const q = search.toLowerCase()
        return (
          opt.code?.toLowerCase().includes(q) ||
          opt.nom.toLowerCase().includes(q) ||
          opt.supplierName?.toLowerCase().includes(q)
        )
      })
    : options

  const selected = options.find(
    (opt) =>
      opt.id === selectedProductId &&
      (selectedSupplierId
        ? opt.productSupplierId === selectedSupplierId
        : !opt.productSupplierId)
  )

  const handleSelect = useCallback(
    (opt: ProductSelectOption | null) => {
      onSelect(opt)
      setOpen(false)
      setSearch("")
    },
    [onSelect]
  )

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex h-7 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-left text-xs transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
        >
          <span className="truncate font-mono text-xs">
            {selected ? (
              selected.code ?? selected.nom
            ) : (
              <span className="text-muted-foreground font-sans">{placeholder}</span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[500px] p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <div className="border-b p-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          <div className="flex items-center gap-2 border-b px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="w-16">Code</span>
            <span className="min-w-[120px] flex-1">Produit</span>
            <span className="w-24">Fournisseur</span>
            {fieldMode === "achat" && (
              <span className="w-20 text-right">Prix Achat</span>
            )}
            <span className="w-20 text-right">Prix Vente</span>
          </div>
          {filtered.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Aucun produit trouvé
            </div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleSelect(opt)}
              >
                <span className="w-16 shrink-0 truncate font-mono text-muted-foreground">
                  {opt.code ?? ""}
                </span>
                <span className="min-w-[120px] flex-1 truncate">{opt.nom}</span>
                <span className="w-24 shrink-0 truncate text-muted-foreground">
                  {opt.supplierName ?? "\u2014"}
                </span>
                {fieldMode === "achat" && (
                  <span className="w-20 shrink-0 text-right tabular-nums">
                    {opt.purchasePrice ? formatTND(opt.purchasePrice) : "\u2014"}
                  </span>
                )}
                <span className="w-20 shrink-0 text-right tabular-nums">
                  {formatTND(opt.prixHT ?? "0")}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
