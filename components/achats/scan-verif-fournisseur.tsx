"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import type { AchatType } from "@/lib/types"

interface Fournisseur {
  id: string
  raisonSociale: string
}

interface Props {
  fournisseurs: Fournisseur[]
  filteredFournisseurs: Fournisseur[]
  selectedFournisseur: Fournisseur | undefined
  referenceFournisseur: string
  dateFacture: string
  dateEcheance: string
  fournisseurSearch: string
  type: AchatType
  onFournisseurChange: (id: string) => void
  onSearchChange: (val: string) => void
  onRefChange: (val: string) => void
  onDateFactureChange: (val: string) => void
  onDateEcheanceChange: (val: string) => void
}

export function ScanVerifFournisseur({
  fournisseurs: _fournisseurs, filteredFournisseurs, selectedFournisseur,
  referenceFournisseur, dateFacture, dateEcheance, type,
  onFournisseurChange, onSearchChange,
  onRefChange, onDateFactureChange, onDateEcheanceChange,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Fournisseur</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Fournisseur</Label>
            <Combobox
              value={selectedFournisseur || null}
              onValueChange={(f) => onFournisseurChange(f ? f.id : "")}
              onInputValueChange={onSearchChange}
              itemToStringLabel={(f) => f ? f.raisonSociale : ""}
            >
              <ComboboxInput className="h-8 text-sm w-full" placeholder="Sélectionner un fournisseur..." />
              <ComboboxContent>
                <ComboboxEmpty>Aucun fournisseur.</ComboboxEmpty>
                <ComboboxList>
                  {filteredFournisseurs.map((f) => (
                    <ComboboxItem key={f.id} value={f}>{f.raisonSociale}</ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Réf. Fournisseur</Label>
            <Input value={referenceFournisseur} onChange={(e) => onRefChange(e.target.value)} className="h-8 text-sm" placeholder={type === "BL" ? "N° BL fournisseur" : "N° facture"} />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{type === "BL" ? "Date Livraison" : "Date Facture"}</Label>
            <Input type="date" value={dateFacture} onChange={(e) => onDateFactureChange(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Date Échéance</Label>
            <Input type="date" value={dateEcheance} onChange={(e) => onDateEcheanceChange(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
