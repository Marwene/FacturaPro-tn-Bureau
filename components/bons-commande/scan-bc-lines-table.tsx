"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import {
  ProductSelect,
  buildProductSelectOptions,
  type ProductSelectOption,
} from "@/components/shared/product-select"

export interface ScanBCLine {
  id: string
  productId: string | null
  createProduct: boolean
  description: string
  quantite: string
  prixHT: string
  remise: string
  tauxTVA: string
  fodec: boolean
  tauxFodec: string
  totalHT: string
  typeSource: "PRODUCTION" | "STOCK"
}

export interface Product {
  id: string
  nom: string
  code?: string
  prixHT: string
  tauxTVA: string
}

type LineUpdate = Partial<Omit<ScanBCLine, "id">>

interface Props {
  lines: ScanBCLine[]
  products: Product[]
  onAddLine: () => void
  onRemoveLine: (id: string) => void
  onUpdateLine: (id: string, updates: LineUpdate) => void
}

export function ScanBCLinesTable({ lines, products, onAddLine, onRemoveLine, onUpdateLine }: Props) {
  const selectOptions = buildProductSelectOptions(products)

  const handleProductSelect = (lineId: string, option: ProductSelectOption | null) => {
    if (!option) {
      onUpdateLine(lineId, { productId: null })
      return
    }
    onUpdateLine(lineId, {
      productId: option.id,
      description: option.nom,
      prixHT: option.prixHT ?? "0",
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">Lignes du bon de commande</CardTitle>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onAddLine}>
          <Plus className="h-3 w-3" /> Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {["Produit", "Description", "Qté", "Prix HT", "Rem.%", "TVA%", "FODEC", "Source", ""].map((h) => (
                  <TableHead key={h} className="text-xs text-muted-foreground font-medium pb-2 pr-2 last:pr-0">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="py-2 pr-2">
                    <ProductSelect
                      selectedProductId={line.productId}
                      options={selectOptions}
                      onSelect={(opt) => handleProductSelect(line.id, opt)}
                      placeholder="Produit..."
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
                    <Input value={line.description} onChange={(e) => onUpdateLine(line.id, { description: e.target.value })}
                      className="h-7 text-xs min-w-32 bg-background" placeholder="Description" />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Input type="text" inputMode="decimal" value={line.quantite}
                      onChange={(e) => onUpdateLine(line.id, { quantite: e.target.value })}
                      className="h-7 text-xs text-right w-16 bg-background" />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Input type="text" inputMode="decimal" value={line.prixHT}
                      onChange={(e) => onUpdateLine(line.id, { prixHT: e.target.value })}
                      className="h-7 text-xs text-right w-24 bg-background" />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Input type="text" inputMode="decimal" value={line.remise}
                      onChange={(e) => onUpdateLine(line.id, { remise: e.target.value })}
                      className="h-7 text-xs text-right w-14 bg-background" />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Select value={line.tauxTVA} onValueChange={(v) => onUpdateLine(line.id, { tauxTVA: v })}>
                      <SelectTrigger className="h-7 text-xs w-16 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["0", "7", "13", "19"].map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{t}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Checkbox
                      checked={line.fodec}
                      onCheckedChange={(v) => onUpdateLine(line.id, { fodec: v === true })}
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Select value={line.typeSource} onValueChange={(v) => onUpdateLine(line.id, { typeSource: v as "PRODUCTION" | "STOCK" })}>
                      <SelectTrigger className="h-7 text-xs w-24 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STOCK" className="text-xs">Stock</SelectItem>
                        <SelectItem value="PRODUCTION" className="text-xs">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                      onClick={() => onRemoveLine(line.id)} disabled={lines.length === 1}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}