"use client"

import { useBLFormStore } from "@/lib/stores/bl-store"
import { useClients, useProducts } from "@/hooks/use-queries"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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

interface BLFormLinesProps {
  displayDevise: string
}

export function BLFormLines({ displayDevise }: BLFormLinesProps) {
  const form = useBLFormStore()
  const { data: productsData } = useProducts()
  const { data: clientsData } = useClients()
  const products = productsData?.products ?? []
  const clients = clientsData?.clients ?? []
  const selectedClient = form.tiersId ? clients.find((c) => c.id === form.tiersId) : null

  const handleAddLine = () => {
    form.addLine()
    if (selectedClient?.exonereTVA || form.blViseActif) {
      const state = useBLFormStore.getState()
      const newLine = state.lines[state.lines.length - 1]
      state.updateLine(newLine.id, { tauxTVA: "0" })
    }
  }

  const handleProductSelect = (lineId: string, option: ProductSelectOption | null) => {
    if (!option) return
    const product = products.find((p) => p.id === option.id)
    if (!product) return
    form.updateLine(lineId, {
      productId: product.id,
      description: product.nom,
      prixHT: product.prixHT,
      tauxTVA: selectedClient?.exonereTVA ? "0" : product.tauxTVA,
      fodec: product.fodec,
      tauxFodec: product.tauxFodec,
    })
  }

  const selectOptions = buildProductSelectOptions(products)

  return (
    <div className="col-span-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">Lignes du Bon de Livraison</CardTitle>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddLine}>
            <Plus className="h-3 w-3" />
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Produit", "Déclinaison", "Description", "Qté", "Prix HT", "Rem.%", "TVA%", "FODEC", "Total HT", ""].map(
                    (h) => (
                      <th key={h} className="text-left text-xs text-muted-foreground font-medium pb-2 pr-2 last:pr-0">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {form.lines.map((line) => {
                  const { ht } = calcLineTotals(line)
                  return (
                    <tr key={line.id}>
                      <td className="py-2 pr-2">
                        <ProductSelect
                          selectedProductId={line.productId}
                          options={selectOptions}
                          onSelect={(opt) => handleProductSelect(line.id, opt)}
                          placeholder="Produit..."
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <VariantSelect
                          productId={line.productId}
                          value={line.variantId}
                          onChange={(variantId) => form.updateLine(line.id, { variantId })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          value={line.description}
                          onChange={(e) => form.updateLine(line.id, { description: e.target.value })}
                          placeholder="Description..."
                          className="h-7 text-xs min-w-36"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="text" inputMode="decimal"
                          value={line.quantite}
                          onChange={(e) => form.updateLine(line.id, { quantite: e.target.value })}
                          className="h-7 text-xs text-right w-16"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="text" inputMode="decimal"
                          value={line.prixHT}
                          onChange={(e) => form.updateLine(line.id, { prixHT: e.target.value })}
                          className="h-7 text-xs text-right w-24"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="text" inputMode="decimal"
                          value={line.remise}
                          onChange={(e) => form.updateLine(line.id, { remise: e.target.value })}
                          className="h-7 text-xs text-right w-16"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={line.tauxTVA}
                          onValueChange={(v) => form.updateLine(line.id, { tauxTVA: v })}
                        >
                          <SelectTrigger className="h-7 text-xs w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="7">7%</SelectItem>
                            <SelectItem value="13">13%</SelectItem>
                            <SelectItem value="19">19%</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2 text-center">
                        <Switch
                          checked={line.fodec}
                          onCheckedChange={(v) => form.updateLine(line.id, { fodec: v })}
                          className="scale-75"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right whitespace-nowrap">
                        <span className="text-xs font-semibold">
                          {formatCurrency(ht.toString(), displayDevise)}
                        </span>
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={() => form.removeLine(line.id)}
                          disabled={form.lines.length === 1}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
