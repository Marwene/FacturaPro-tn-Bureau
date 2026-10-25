"use client"

import { useBLFormStore } from "@/lib/stores/bl-store"
import { useBLTauxBCT, useBLMontantTndSync } from "@/hooks/use-bl"
import { useCompanyStore } from "@/lib/stores/company-store"
import { useClients, useCompany } from "@/hooks/use-queries"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Big from "big.js"
import { formatCurrency, parseTunisianNumber } from "@/lib/decimal"
import { calcLineTotals } from "@/lib/calc-line-totals"
import { BLFormVise } from "./bl-form-vise"
import { BLFormLines } from "./bl-form-lines"

export function NouveauBLClient() {
  const form = useBLFormStore()
  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)
  const { data: companyData } = useCompany(selectedCompanyId)
  const { data: clientsData } = useClients()
  const clients = clientsData?.clients ?? []

  useBLTauxBCT(form.devise, form.blViseActif && form.devise !== "TND")

  let totalHT = new Big(0)
  let totalTVA = new Big(0)
  let totalFodec = new Big(0)

  const selectedClient = clients.find((c) => c.id === form.tiersId)

  for (const line of form.lines) {
    const { ht, fodec, tva } = calcLineTotals(line)
    totalHT = totalHT.plus(ht)
    totalTVA = totalTVA.plus(tva)
    totalFodec = totalFodec.plus(fodec)
  }

  const totalTTC = totalHT.plus(totalTVA).plus(totalFodec)

  let totalRemise = new Big(0)
  let totalBaseAvantRemise = new Big(0)
  for (const line of form.lines) {
    const qty = new Big(parseTunisianNumber(line.quantite) || 0)
    const prix = new Big(parseTunisianNumber(line.prixHT) || 0)
    const baseLine = qty.times(prix)
    const rem = new Big(parseTunisianNumber(line.remise) || 0)
    const remiseAmount = baseLine.times(rem.div(100))
    totalBaseAvantRemise = totalBaseAvantRemise.plus(baseLine)
    totalRemise = totalRemise.plus(remiseAmount)
  }
  const lignesAvecRemise = form.lines.filter(l => new Big(parseTunisianNumber(l.remise) || 0).gt(0));
  const tousLesTauxUniques = [...new Set(lignesAvecRemise.map(l => l.remise))];
  const remisePercent = totalRemise.gt(0)
    ? tousLesTauxUniques.length === 1
        ? tousLesTauxUniques[0]
        : totalBaseAvantRemise.gt(0)
            ? `~${totalRemise.div(totalBaseAvantRemise).times(100).toFixed(1)}`
            : "0"
    : "0"

  let totalHTForTVA = new Big(0)
  let totalTVAForTVA = new Big(0)
  for (const line of form.lines) {
    const qty = new Big(parseTunisianNumber(line.quantite) || 0)
    const prix = new Big(parseTunisianNumber(line.prixHT) || 0)
    const rem = new Big(parseTunisianNumber(line.remise) || 0)
    const remFactor = new Big(1).minus(rem.div(100))
    const ht = qty.times(prix).times(remFactor)
    const tva = ht.times(new Big(parseTunisianNumber(line.tauxTVA) || 0).div(100))
    totalTVAForTVA = totalTVAForTVA.plus(tva)
    totalHTForTVA = totalHTForTVA.plus(ht)
  }
  const tauxTVAMoyen = totalHTForTVA.gt(0)
    ? totalTVAForTVA.div(totalHTForTVA).times(100).toFixed(1)
    : "0"

  const timbreFiscal = new Big("1.000")
  const displayDevise = form.blViseActif ? form.devise : "TND"
  const showBlVise = companyData?.company?.type === "OFFSHORE"

  // Calculer et stocker montantTND — affiché dans BLFormVise (saisie manuelle
  // possible) ET lu par buildPayload()/buildInvoicePayload() — déplacé tel quel
  // dans hooks/use-bl.ts (ex-useEffect [totalTTC.toFixed(3), form.tauxChange,
  // form.blViseActif, form.devise] : mêmes 4 dépendances en queryKey, mêmes
  // branches/gardes, écriture via getState() hors cycle de rendu).
  useBLMontantTndSync(totalTTC, form.tauxChange, form.blViseActif, form.devise)

  const handleClientChange = (id: string) => {
    form.setTiersId(id)
    const newClient = clients.find((c) => c.id === id)
    if (newClient?.exonereTVA) {
      form.lines.forEach((l) => {
        if (l.tauxTVA !== "0") form.updateLine(l.id, { tauxTVA: "0" })
      })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
        {/* Informations BL */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Informations Bon de Livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Numéro de BL</Label>
              <Input value="BL — auto-généré" disabled className="h-8 text-sm bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date de création</Label>
              <Input type="date" value={form.dateCreation} onChange={(e) => form.setDateCreation(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date de livraison</Label>
              <Input type="date" value={form.dateLivraison} onChange={(e) => form.setDateLivraison(e.target.value)} className="h-8 text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* Client */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Label className="text-xs">Sélectionner un Client</Label>
              <Select value={form.tiersId} onValueChange={handleClientChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Choisir un client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClient && (
              <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-xs space-y-1">
                <p className="font-semibold">{selectedClient.raisonSociale}</p>
                {selectedClient.matriculeFiscal && (
                  <p className="text-muted-foreground font-mono">MF: {selectedClient.matriculeFiscal}</p>
                )}
                {selectedClient.ville && (
                  <p className="text-muted-foreground">{selectedClient.ville}</p>
                )}
                <div className="flex gap-1 pt-0.5">
                  {selectedClient.assujettTVA && !selectedClient.exonereTVA && (
                    <Badge variant="outline" className="text-xs py-0">TVA</Badge>
                  )}
                  {selectedClient.exonereTVA && (
                    <Badge variant="outline" className="text-xs py-0">Exonéré TVA</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BL Visé sous douane */}
        {showBlVise && <BLFormVise />}

        {/* Lignes */}
        <BLFormLines displayDevise={displayDevise} />

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Notes et Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Notes, conditions de livraison..."
              value={form.notes}
              onChange={(e) => form.setNotes(e.target.value)}
              className="text-sm resize-none h-28"
            />
          </CardContent>
        </Card>

        {/* Récapitulatif */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Base HT</span>
              <span className="text-xs">{formatCurrency(totalHT.toString(), displayDevise)}</span>
            </div>
            {totalRemise.gt(0) && (
              <div className="flex justify-between text-orange-600">
                <span className="text-xs">Remise ({remisePercent}%)</span>
                <span className="text-xs">-{formatCurrency(totalRemise.toString(), displayDevise)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Total HT</span>
              <span className="text-xs font-medium">{formatCurrency(totalHT.toString(), displayDevise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">TVA ({tauxTVAMoyen}%)</span>
              <span className="text-xs">{formatCurrency(totalTVA.toString(), displayDevise)}</span>
            </div>
            {totalFodec.gt(0) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">FODEC (1%)</span>
                <span className="text-xs">{formatCurrency(totalFodec.toString(), displayDevise)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Timbre fiscal</span>
              <span className="text-xs">{formatCurrency(timbreFiscal.toString(), "TND")}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between">
              <span className="text-sm font-bold">Total TTC</span>
              <span className="text-sm font-bold">{formatCurrency(totalTTC.plus(timbreFiscal).toString(), displayDevise)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
