"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, X, Loader2, FileText, User, StickyNote, Calculator } from "lucide-react"
import { formatCurrency, parseTunisianNumber } from "@/lib/decimal"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { ProductSelect, buildProductSelectOptions } from "@/components/shared/product-select"

interface Client {
  id: string
  raisonSociale: string
  ville?: string | null
  matriculeFiscal?: string | null
}

interface Product {
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

interface BCManualLine {
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

interface Props {
  clients: Client[]
  products: Product[]
  formTiersId: string
  onFormTiersId: (v: string) => void
  formDate: string
  onFormDate: (v: string) => void
  formDateExpiration: string
  onFormDateExpiration: (v: string) => void
  formRefClient: string
  onFormRefClient: (v: string) => void
  formNotes: string
  onFormNotes: (v: string) => void
  lines: BCManualLine[]
  onAddLine: () => void
  onRemoveLine: (id: string) => void
  onUpdateLine: (id: string, updates: Partial<BCManualLine>) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
}

export function ScanBCManualEntry({
  clients, products,
  formTiersId, onFormTiersId,
  formDate, onFormDate,
  formDateExpiration, onFormDateExpiration,
  formRefClient, onFormRefClient,
  formNotes, onFormNotes,
  lines, onAddLine, onRemoveLine, onUpdateLine,
  onSave, onCancel, isSaving,
}: Props) {
  const [clientSearch, setClientSearch] = useState("")

  const selectedClient = clients.find((c) => c.id === formTiersId  )
  const filteredClients = clients.filter((c) =>
    c.raisonSociale.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const productSelectOptions = buildProductSelectOptions(products)

  const totals = useMemo(() => {
    let baseHT = 0
    let totalRemise = 0
    let totalTVA = 0
    let totalFodec = 0

    for (const line of lines) {
      const prix = parseTunisianNumber(line.prixHT) || 0
      const qte = parseTunisianNumber(line.quantite) || 0
      const remisePct = parseTunisianNumber(line.remise) || 0
      const tauxTVA = Number(line.tauxTVA) || 0
      const tauxFodec = Number(line.tauxFodec) || 1

      const lineHT = prix * qte
      const remiseAmount = lineHT * (remisePct / 100)
      const lineAfterRemise = lineHT - remiseAmount
      const lineTVA = lineAfterRemise * (tauxTVA / 100)
      const lineFodec = lineAfterRemise * (line.fodec ? tauxFodec / 100 : 0)

      baseHT += lineHT
      totalRemise += remiseAmount
      totalTVA += lineTVA
      totalFodec += lineFodec
    }

    const totalHT = baseHT - totalRemise
    const timbre = 1.000
    const totalTTC = totalHT + totalTVA + totalFodec + timbre

    return { baseHT, totalRemise, totalHT, totalTVA, totalFodec, totalTTC }
  }, [lines])

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
    <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
      {/* Card Informations BC */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Informations Bon de Commande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">N° BC</Label>
            <Input
              value="BC — auto-généré"
              disabled
              className="h-8 text-sm bg-muted text-muted-foreground"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Date création</Label>
            <Input
              type="date"
              value={formDate}
              onChange={(e) => onFormDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Date expiration</Label>
            <Input
              type="date"
              value={formDateExpiration}
              onChange={(e) => onFormDateExpiration(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Référence client</Label>
            <Input
              value={formRefClient}
              onChange={(e) => onFormRefClient(e.target.value)}
              className="h-8 text-sm"
              placeholder="Référence du document client"
            />
          </div>
        </CardContent>
      </Card>

      {/* Card Client */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Client
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Sélectionner un client</Label>
            <Combobox
              value={selectedClient || null}
              onValueChange={(c) => onFormTiersId(c ? c.id : "")}
              onInputValueChange={setClientSearch}
              itemToStringLabel={(c) => (c ? c.raisonSociale : "")}
            >
              <ComboboxInput className="h-8 text-sm w-full" placeholder="Rechercher un client..." />
              <ComboboxContent>
                <ComboboxEmpty>Aucun client trouvé.</ComboboxEmpty>
                <ComboboxList>
                  {filteredClients.map((c) => (
                    <ComboboxItem key={c.id} value={c}>
                      {c.raisonSociale}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          {selectedClient && (
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs space-y-1">
              <p className="font-semibold">{selectedClient.raisonSociale}</p>
              {selectedClient.matriculeFiscal && (
                <p className="text-muted-foreground font-mono">
                  MF: {selectedClient.matriculeFiscal}
                </p>
              )}
              {selectedClient.ville && (
                <p className="text-muted-foreground">{selectedClient.ville}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Lignes - pleine largeur */}
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
                  const prix = parseTunisianNumber(line.prixHT) || 0
                  const qte = parseTunisianNumber(line.quantite) || 0
                  const remisePct = parseTunisianNumber(line.remise) || 0
                  const lineHT = prix * qte
                  const remiseAmount = lineHT * (remisePct / 100)
                  const totalHT = lineHT - remiseAmount

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

      {/* Card Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <StickyNote className="h-4 w-4" />
            Notes et Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Notes, conditions de paiement..."
            value={formNotes}
            onChange={(e) => onFormNotes(e.target.value)}
            className="text-sm resize-none h-28"
          />
        </CardContent>
      </Card>

      {/* Card Récapitulatif */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Calculator className="h-4 w-4" />
            Récapitulatif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Base HT</span>
            <span className="text-xs tabular-nums">{formatCurrency(totals.baseHT.toFixed(3), "TND")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Remise</span>
            <span className="text-xs tabular-nums text-destructive">-{formatCurrency(totals.totalRemise.toFixed(3), "TND")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Total HT</span>
            <span className="text-xs tabular-nums">{formatCurrency(totals.totalHT.toFixed(3), "TND")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">TVA</span>
            <span className="text-xs tabular-nums">{formatCurrency(totals.totalTVA.toFixed(3), "TND")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">FODEC</span>
            <span className="text-xs tabular-nums">{formatCurrency(totals.totalFodec.toFixed(3), "TND")}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-muted-foreground">Timbre fiscal</span>
            <span className="text-xs tabular-nums">{formatCurrency("1.000", "TND")}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between">
            <span className="text-sm font-bold">Total TTC</span>
            <span className="text-sm font-bold tabular-nums">{formatCurrency(totals.totalTTC.toFixed(3), "TND")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Boutons - pleine largeur */}
      <div className="col-span-2 flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} className="gap-1.5">
          <X className="h-4 w-4" />
          Annuler
        </Button>
        <Button onClick={onSave} disabled={isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer le bon de commande
        </Button>
      </div>
    </div>
  )
}
