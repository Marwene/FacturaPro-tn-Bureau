"use client"

import type { AchatFormState } from "@/lib/stores/achats-store"
import { ACHAT_CATEGORIE_LABELS } from "@/lib/stores/achats-store"
import type { AchatCategorie } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/shared/form-field"
import { MoneyCell } from "@/components/shared/money-cell"
import { useAchatBls } from "@/hooks/use-achats-queries"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, PenLine, X } from "lucide-react"
import Big from "big.js"
import { formatCurrency } from "@/lib/decimal"

interface ManualEntryFormProps {
  form: AchatFormState
  fournisseurs: { id: string; raisonSociale: string }[]
  products: { id: string; code: string; nom: string; prixAchat: string }[]
  selectedFournisseur: { id: string; raisonSociale: string; ville?: string | null } | undefined
  totalHT: Big
  totalTVA: Big
  totalTTC: Big
  onCancel: () => void
}

export function ManualEntryForm({
  form,
  fournisseurs,
  products,
  selectedFournisseur,
  totalHT,
  totalTVA,
  totalTTC,
  onCancel,
}: ManualEntryFormProps) {
  const { data: blsData } = useAchatBls(form.tiersId)
  const bls = blsData?.achats ?? []
  const filteredFournisseurs = fournisseurs.filter((f) =>
    f.raisonSociale.toLowerCase().includes(form.tiersSearch.toLowerCase())
  )
  const filteredProducts = products.filter((p) => {
    const q = form.productSearch.toLowerCase()
    return p.nom.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))
  })

  function handleProductSelect(lineId: string, productId: string) {
    if (productId === "none") return
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const currentLine = form.lines.find((l) => l.id === lineId)
    form.updateLine(lineId, {
      productId: product.id,
      description: currentLine?.description || product.nom,
      prixAchat: currentLine?.prixAchat || product.prixAchat,
    })
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <PenLine className="h-4 w-4" />
          Saisie manuelle
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fournisseur" className="gap-1">
            <Combobox
              value={selectedFournisseur || null}
              onValueChange={(f) => form.setTiersId(f ? f.id : "")}
              onInputValueChange={(val) => form.setTiersSearch(val)}
              itemToStringLabel={(f) => f ? f.raisonSociale : ""}
            >
              <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher..." />
              <ComboboxContent>
                <ComboboxEmpty>Aucun fournisseur.</ComboboxEmpty>
                <ComboboxList>
                  {filteredFournisseurs.map((f) => (
                    <ComboboxItem key={f.id} value={f}>
                      {f.raisonSociale}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </FormField>
          <FormField label="Réf. Fournisseur" className="gap-1">
            <Input
              value={form.referenceFournisseur}
              onChange={(e) => form.setReferenceFournisseur(e.target.value)}
              className="h-8 text-sm"
              placeholder={form.type === "BL" ? "N° BL fournisseur" : "N° facture"}
            />
          </FormField>
          <FormField label={form.type === "BL" ? "Date Livraison" : "Date Facture"} className="gap-1">
            <Input type="date" value={form.dateFacture} onChange={(e) => form.setDateFacture(e.target.value)} className="h-8 text-sm" />
          </FormField>
          <FormField label="Date Échéance" className="gap-1">
            <Input type="date" value={form.dateEcheance} onChange={(e) => form.setDateEcheance(e.target.value)} className="h-8 text-sm" />
          </FormField>
          <FormField label="Catégorie d'achat" className="gap-1">
            <Select
              value={form.categorieAchat ?? ""}
              onValueChange={(v) => form.setCategorieAchat(v === "" ? null : (v as AchatCategorie))}
            >
              <SelectTrigger className="h-8 text-sm w-full">
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACHAT_CATEGORIE_LABELS) as AchatCategorie[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {ACHAT_CATEGORIE_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Rattacher au BL d'achat"
            className="gap-1"
            description="Le stock a déjà été mis à jour par le BL ; la facture liée ne créera pas de nouvelle entrée de stock."
          >
            <Select
              value={form.blAchatId ?? "none"}
              onValueChange={(v) => form.setBlAchatId(v === "none" ? null : v)}
              disabled={form.type !== "FACTURE" || !form.tiersId}
            >
              <SelectTrigger className="h-8 text-sm w-full">
                <SelectValue placeholder={form.type !== "FACTURE" ? "Disponible pour les factures" : !form.tiersId ? "Sélectionnez d'abord un fournisseur" : "Sélectionner un BL"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Aucun —</SelectItem>
                {bls.map((bl) => (
                  <SelectItem key={bl.id} value={bl.id}>
                    BL {bl.numero} — {bl.referenceFournisseur ?? (bl.tiers as { raisonSociale?: string })?.raisonSociale ?? ""} — {formatCurrency(bl.totalTTC, "TND")} — {bl.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Lignes</Label>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => form.addLine()}>
              <Plus className="h-3 w-3" />
              Ajouter
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {form.lines.map((line) => (
              <div key={line.id} className="flex items-center gap-2">
                <Combobox
                  value={products.find(p => p.id === line.productId) || null}
                  onValueChange={(p) => handleProductSelect(line.id, p ? p.id : "none")}
                  onInputValueChange={(val) => form.setProductSearch(val)}
                  itemToStringLabel={(p) => p ? p.nom : ""}
                >
                  <ComboboxInput className="h-7 text-xs w-28 bg-background" placeholder="Produit..." />
                  <ComboboxContent>
                    <ComboboxEmpty>Aucun.</ComboboxEmpty>
                    <ComboboxList>
                      {filteredProducts.map((p) => (
                        <ComboboxItem key={p.id} value={p}>
                          {p.nom}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <Input
                  value={line.description}
                  onChange={(e) => form.updateLine(line.id, { description: e.target.value })}
                  className="h-7 text-xs w-36"
                  placeholder="Description"
                />
                <Input
                  type="text" inputMode="decimal"
                  value={line.quantite}
                  onChange={(e) => form.updateLine(line.id, { quantite: e.target.value })}
                  className="h-7 text-xs w-16 text-right"
                  placeholder="Qté"
                />
                <Input
                  type="text" inputMode="decimal"
                  value={line.prixAchat}
                  onChange={(e) => form.updateLine(line.id, { prixAchat: e.target.value })}
                  className="h-7 text-xs w-24 text-right"
                  placeholder="Prix"
                />
                <Select value={line.tauxTVA} onValueChange={(v) => form.updateLine(line.id, { tauxTVA: v })}>
                  <SelectTrigger className="h-7 text-xs w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="19">19%</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0"
                  onClick={() => form.removeLine(line.id)}
                  disabled={form.lines.length === 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
          <Label className="text-xs">Timbre fiscal</Label>
          <Input
            type="number" inputMode="decimal"
            value={form.timbreFiscal}
            onChange={(e) => form.setTimbreFiscal(e.target.value)}
            className="h-7 w-24 text-right text-xs"
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-semibold">Total TTC</span>
          <span className="font-bold"><MoneyCell value={totalTTC.toString()} /></span>
        </div>
      </CardContent>
    </Card>
  )
}
