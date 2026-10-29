"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"
import { formatCurrency, formatTND } from "@/lib/decimal"
import { calcLineTotals } from "@/lib/calc-line-totals"
import { VariantSelect } from "./variant-select"
import {
  ProductSelect,
  buildProductSelectOptions,
  type ProductSelectOption,
} from "./product-select"
import {
  buildProductSelectUpdates,
  type LineItem,
  type LineItemsTableProps,
} from "./line-items-table-logic"

export type { LineItem, ProductOption, ProductSupplierOption } from "./line-items-table-logic"

export function LineItemsTable({
  lines,
  products,
  currency = "TND",
  showFodec = true,
  exonereTVA = false,
  fieldMode = "vente",
  productLabel = "Produit",
  title = "Lignes",
  addButtonLabel = "Ajouter une ligne",
  onAddLine,
  onRemoveLine,
  onUpdateLine,
}: LineItemsTableProps) {
  const priceField = fieldMode === "achat" ? "prixAchat" : "prixHT"
  const priceLabel = fieldMode === "achat" ? "Prix Achat" : "Prix HT"
  const selectOptions = buildProductSelectOptions(products)

  const handleProductSelect = (lineId: string, option: ProductSelectOption | null) => {
    const updates = buildProductSelectUpdates(products, option, {
      priceField,
      fieldMode,
      exonereTVA,
    })
    if (updates) onUpdateLine(lineId, updates)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={onAddLine}
        >
          <Plus className="h-3 w-3" />
          {addButtonLabel}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left text-xs text-muted-foreground font-medium">
                {productLabel}
              </TableHead>
              <TableHead className="text-left text-xs text-muted-foreground font-medium">
                Déclinaison
              </TableHead>
              <TableHead className="text-left text-xs text-muted-foreground font-medium">
                Description
              </TableHead>
              <TableHead className="text-left text-xs text-muted-foreground font-medium">
                Qté
              </TableHead>
              <TableHead className="text-left text-xs text-muted-foreground font-medium">
                {priceLabel}
              </TableHead>
              <TableHead className="text-left text-xs text-muted-foreground font-medium">
                Rem. %
              </TableHead>
              <TableHead className="text-left text-xs text-muted-foreground font-medium">
                TVA %
              </TableHead>
              {showFodec && (
                <TableHead className="text-center text-xs text-muted-foreground font-medium">
                  FODEC
                </TableHead>
              )}
              <TableHead className="text-right text-xs text-muted-foreground font-medium">
                Total HT
              </TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const ht = calcLineTotals({
                ...line,
                prixHT: fieldMode === "achat" ? undefined : line.prixHT,
                prixAchat: fieldMode === "achat" ? line.prixAchat : undefined,
              }).ht.toNumber()
              return (
                <TableRow
                  key={line.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="py-2 pr-2">
                    <ProductSelect
                      selectedProductId={line.productId}
                      selectedSupplierId={line.productSupplierId ?? null}
                      options={selectOptions}
                      fieldMode={fieldMode}
                      onSelect={(opt) => handleProductSelect(line.id, opt)}
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <VariantSelect
                      productId={line.productId}
                      value={line.variantId}
                      onChange={(variantId) => onUpdateLine(line.id, { variantId })}
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Input
                      value={line.description}
                      onChange={(e) =>
                        onUpdateLine(line.id, { description: e.target.value })
                      }
                      placeholder="Description..."
                      className="h-7 text-xs min-w-36 bg-background"
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={line.quantite}
                      onChange={(e) =>
                        onUpdateLine(line.id, { quantite: e.target.value })
                      }
                      className="h-7 text-xs text-right w-16 bg-background"
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={(line[priceField as keyof LineItem] as string) ?? ""}
                      onChange={(e) =>
                        onUpdateLine(line.id, { [priceField]: e.target.value })
                      }
                      className="h-7 text-xs text-right w-24 bg-background"
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={line.remise}
                      onChange={(e) =>
                        onUpdateLine(line.id, { remise: e.target.value })
                      }
                      className="h-7 text-xs text-right w-16 bg-background"
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-2">
                    <Select
                      value={line.tauxTVA}
                      onValueChange={(v) =>
                        onUpdateLine(line.id, { tauxTVA: v })
                      }
                      disabled={exonereTVA}
                    >
                      <SelectTrigger className="h-7 text-xs w-16 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["0", "7", "13", "19"].map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {showFodec && (
                    <TableCell className="py-2">
                      <div className="flex justify-center items-center h-full">
                        <Checkbox
                          checked={exonereTVA ? false : (line.fodec ?? false)}
                          disabled={exonereTVA}
                          onCheckedChange={(v) =>
                            onUpdateLine(line.id, { fodec: v === true })
                          }
                        />
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="py-2 text-right">
                    <span className="text-xs font-semibold">
                      {currency === "TND"
                        ? formatTND(ht.toString())
                        : formatCurrency(ht.toString(), currency)}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-red-500"
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
    </div>
  )
}
