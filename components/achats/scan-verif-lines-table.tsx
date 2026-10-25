"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency } from "@/lib/decimal"
import { calcLineTotals } from "@/lib/calc-line-totals"
import { Plus, Trash2 } from "lucide-react"

interface Line {
  id: string
  productId?: string | null
  createProduct: boolean
  description: string
  quantite: string
  prixAchat: string
  remise: string
  tauxTVA: string
}

interface Product {
  id: string
  nom: string
  code?: string
  prixAchat: string
}

type LineUpdate = Partial<Omit<Line, "id">>

interface Props {
  lines: Line[]
  products: Product[]
  filteredProducts: Product[]
  productSearch: string
  onAddLine: () => void
  onRemoveLine: (id: string) => void
  onUpdateLine: (id: string, updates: LineUpdate) => void
  onProductSelect: (lineId: string, productId: string) => void
  onProductSearchChange: (val: string) => void
}

export function ScanVerifLinesTable({
  lines, products, filteredProducts,
  onAddLine, onRemoveLine, onUpdateLine, onProductSelect, onProductSearchChange,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">Lignes d&apos;Achat</CardTitle>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onAddLine}>
          <Plus className="h-3 w-3" /> Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {["Produit", "Description", "Qté", "Prix Achat", "Rem.%", "TVA%", "Total HT", ""].map((h) => (
                  <TableHead key={h} className="text-xs text-muted-foreground font-medium pb-2 pr-2 last:pr-0">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const { ht } = calcLineTotals(line)
                return (
                  <TableRow key={line.id}>
                    <TableCell className="py-2 pr-2">
                      <Combobox
                        value={products.find(p => p.id === line.productId) || null}
                        onValueChange={(p) => onProductSelect(line.id, p ? p.id : "none")}
                        onInputValueChange={onProductSearchChange}
                        itemToStringLabel={(p) => p ? p.nom : ""}
                      >
                        <ComboboxInput className="h-7 text-xs w-32 bg-background" placeholder="Produit..." />
                        <ComboboxContent>
                          <ComboboxEmpty>Aucun produit.</ComboboxEmpty>
                          <ComboboxList>
                            {filteredProducts.map((p) => (
                              <ComboboxItem key={p.id} value={p}>
                                <span className="font-mono text-xs mr-1">{p.code}</span>
                                {p.nom}
                              </ComboboxItem>
                            ))}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
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
                      <Input type="text" inputMode="decimal" value={line.prixAchat}
                        onChange={(e) => onUpdateLine(line.id, { prixAchat: e.target.value })}
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
                    <TableCell className="py-2 pr-2 text-right whitespace-nowrap">
                      <span className="text-xs font-semibold">{formatCurrency(ht.toString(), "TND")}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500"
                        onClick={() => onRemoveLine(line.id)} disabled={lines.length === 1}>
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
