"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/decimal"
import { ProductSelect, buildProductSelectOptions } from "@/components/shared/product-select"
import { computeBCLineTotals, type BCManualLine } from "./scan-bc-totals"

export interface ManualBCProduct {
  id: string
  nom: string
  code?: string
  prixHT: string
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
}

interface ScanBCManualLinesTableProps {
  lines: BCManualLine[]
  products: ManualBCProduct[]
  onAddLine: () => void
  onRemoveLine: (id: string) => void
  onUpdateLine: (id: string, updates: Partial<BCManualLine>) => void
}

export function ScanBCManualLinesTable({
  lines, products,
  onAddLine, onRemoveLine, onUpdateLine,
}: ScanBCManualLinesTableProps) {
  const productSelectOptions = buildProductSelectOptions(products)

  function handleProductSelect(lineId: string, productId: string) {
    if (productId === "none") return
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const currentLine = lines.find((l) => l.id === lineId)
    onUpdateLine(lineId, {
      productId: product.id,
      description: currentLine?.description || product.nom,
      prixHT: currentLine?.prixHT || product.prixHT,
    })
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">Lignes du bon de commande</CardTitle>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onAddLine}>
          <Plus className="h-3 w-3" />
          Ajouter une ligne
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                {["Produit", "Description", "Qté", "Prix HT", "Rem.%", "TVA%", "FODEC", "Source", "Total HT", ""].map((h) => (
                  <TableHead key={h} className="text-left text-xs text-muted-foreground font-medium pb-2 pr-2 last:pr-0">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {lines.map((line) => {
                const { totalHT } = computeBCLineTotals(line)

                return (
                  <TableRow key={line.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="py-2 pr-2">
                      <ProductSelect
                        selectedProductId={line.productId}
                        options={productSelectOptions}
                        fieldMode="vente"
                        onSelect={(opt) => {
                          if (opt) {
                            handleProductSelect(line.id, opt.id)
                          }
                        }}
                      />
                      {!line.productId && (
                        <label className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={line.createProduct}
                            onCheckedChange={(v) => onUpdateLine(line.id, { createProduct: v === true })}
                          />
                          Créer le produit
                        </label>
                      )}
                    </TableCell>
                    <TableCell className="py-2 pr-2">
                      <Input
                        value={line.description}
                        onChange={(e) => onUpdateLine(line.id, { description: e.target.value })}
                        placeholder="Description..."
                        className="h-7 text-xs min-w-36 bg-background"
                      />
                    </TableCell>
                    <TableCell className="py-2 pr-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={line.quantite}
                        onChange={(e) => onUpdateLine(line.id, { quantite: e.target.value })}
                        className="h-7 text-xs text-right w-16 bg-background tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="py-2 pr-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={line.prixHT}
                        onChange={(e) => onUpdateLine(line.id, { prixHT: e.target.value })}
                        className="h-7 text-xs text-right w-24 bg-background tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="py-2 pr-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={line.remise}
                        onChange={(e) => onUpdateLine(line.id, { remise: e.target.value })}
                        className="h-7 text-xs text-right w-16 bg-background tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="py-2 pr-2">
                      <Select value={line.tauxTVA} onValueChange={(v) => onUpdateLine(line.id, { tauxTVA: v })}>
                        <SelectTrigger className="h-7 text-xs w-16 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["0", "7", "13", "19"].map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">{t}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2 pr-2 text-center">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox
                          checked={line.fodec}
                          onCheckedChange={(v) => onUpdateLine(line.id, { fodec: v === true })}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-2 pr-2">
                      <Select value={line.typeSource} onValueChange={(v) => onUpdateLine(line.id, { typeSource: v as "PRODUCTION" | "STOCK" })}>
                        <SelectTrigger className="h-7 text-xs w-24 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STOCK" className="text-xs">Stock</SelectItem>
                          <SelectItem value="PRODUCTION" className="text-xs">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2 pr-2 text-right whitespace-nowrap">
                      <span className="text-xs font-semibold tabular-nums">{formatCurrency(totalHT.toFixed(3), "TND")}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveLine(line.id)}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
