"use client"

import { useInvoiceFormStore } from "@/lib/stores/invoices-store"
import { useProducts } from "@/hooks/use-queries"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/decimal"
import { calcLineTotals } from "@/lib/calc-line-totals"
import { VariantSelect } from "@/components/shared/variant-select"
import {
  ProductSelect,
  buildProductSelectOptions,
  type ProductSelectOption,
} from "@/components/shared/product-select"

export function InvoiceFormLines({ clientExonereTVA }: { clientExonereTVA?: boolean }) {
  const form = useInvoiceFormStore()
  const { data: productsData } = useProducts()
  const products = productsData?.products ?? []

  const selectOptions = buildProductSelectOptions(products)

  const handleProductSelect = (lineId: string, option: ProductSelectOption | null) => {
    if (!option) return
    const product = products.find((p) => p.id === option.id)
    if (!product) return
    form.updateLine(lineId, {
      productId: product.id,
      description: product.nom,
      prixHT: product.prixHT,
      tauxTVA: clientExonereTVA ? "0" : product.tauxTVA,
      fodec: product.fodec,
      tauxFodec: product.tauxFodec,
    })
  }

  const handleAddLine = () => {
    form.addLine()
    const state = useInvoiceFormStore.getState()
    const newLine = state.lines[state.lines.length - 1]
    if (clientExonereTVA) {
      form.updateLine(newLine.id, { tauxTVA: "0" })
    }
  }

  return (
    <div className="col-span-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Lignes de Facturation</CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddLine}>
            <Plus className="h-3 w-3" />
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border">
                  {["Produit", "Déclinaison", "Description", "Qté", "Prix HT", "Rem.%", "TVA%", "FODEC", "Total HT", ""].map((h) => (
                    <TableHead key={h} className="text-left text-xs text-muted-foreground font-medium pb-2 pr-2 last:pr-0">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {form.lines.map((line) => {
                  const { ht } = calcLineTotals(line)
                  return (
                    <TableRow key={line.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="py-2 pr-2">
                        <ProductSelect
                          selectedProductId={line.productId}
                          options={selectOptions}
                          onSelect={(opt) => handleProductSelect(line.id, opt)}
                          placeholder="Produit..."
                        />
                      </TableCell>
                      <TableCell className="py-2 pr-2">
                        <VariantSelect
                          productId={line.productId}
                          value={line.variantId}
                          onChange={(variantId) => form.updateLine(line.id, { variantId })}
                        />
                      </TableCell>
                      <TableCell className="py-2 pr-2">
                        <Input value={line.description} onChange={(e) => form.updateLine(line.id, { description: e.target.value })}
                          placeholder="Description..." className="h-7 text-xs min-w-36 bg-background" />
                      </TableCell>
                      <TableCell className="py-2 pr-2">
                        <Input type="text" inputMode="decimal" value={line.quantite}
                          onChange={(e) => form.updateLine(line.id, { quantite: e.target.value })}
                          className="h-7 text-xs text-right w-16 bg-background" />
                      </TableCell>
                      <TableCell className="py-2 pr-2">
                        <Input type="text" inputMode="decimal" value={line.prixHT}
                          onChange={(e) => form.updateLine(line.id, { prixHT: e.target.value })}
                          className="h-7 text-xs text-right w-24 bg-background" />
                      </TableCell>
                      <TableCell className="py-2 pr-2">
                        <Input type="text" inputMode="decimal" value={line.remise}
                          onChange={(e) => form.updateLine(line.id, { remise: e.target.value })}
                          className="h-7 text-xs text-right w-16 bg-background" />
                      </TableCell>
                      <TableCell className="py-2 pr-2">
                        <Select value={line.tauxTVA} onValueChange={(v) => form.updateLine(line.id, { tauxTVA: v })}>
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
                          <Checkbox checked={line.fodec} onCheckedChange={(v) => form.updateLine(line.id, { fodec: v === true })} />
                        </div>
                      </TableCell>
                      <TableCell className="py-2 pr-2 text-right whitespace-nowrap">
                        <span className="text-xs font-semibold">{formatCurrency(ht.toString(), form.devise)}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={() => form.removeLine(line.id)} disabled={form.lines.length === 1}>
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
    </div>
  )
}
