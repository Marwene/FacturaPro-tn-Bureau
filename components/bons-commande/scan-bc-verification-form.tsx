"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, X } from "lucide-react"
import { formatCurrency } from "@/lib/decimal"
import { notify } from "@/lib/notify"
import { ScanBCLinesTable } from "./scan-bc-lines-table"
import { ScanBCInfosCard, ScanBCClientCard } from "./scan-bc-verification-sections"
import {
  computeRemiseTotale,
  type ScanBCVerificationProps,
} from "./scan-bc-verification-logic"

function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  const displayValue = focused ? value : formatCurrency(value, "TND")
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-28 text-right text-xs tabular-nums"
    />
  )
}

export function ScanBCVerificationForm({
  extracted, clients, matchedClient, formTiersId, onFormTiersId,
  formDate, onFormDate, formNotes, onFormNotes,
  formRefClient, onFormRefClient, formDateExpiration, onFormDateExpiration,
  createClient, onCreateClient,
  totalHT, onTotalHT, totalTVA, onTotalTVA, totalTTC, onTotalTTC,
  timbreFiscal, onTimbreFiscal,
  products, onUpdateLine, onAddLine, onRemoveLine,
  onConfirm, onSaveDraft, onReset, isSaving,
}: ScanBCVerificationProps) {
  const handleConfirm = () => {
    if (!formTiersId && !(createClient && extracted.clientName)) {
      notify.warning({
        title: "Client non renseigné",
        description: "Sélectionnez un client ou cochez la création automatique du client détecté.",
      })
      return
    }
    onConfirm()
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScanBCInfosCard
          referenceBC={extracted.referenceBC}
          formDate={formDate}
          onFormDate={onFormDate}
          formDateExpiration={formDateExpiration}
          onFormDateExpiration={onFormDateExpiration}
          formRefClient={formRefClient}
          onFormRefClient={onFormRefClient}
        />
        <ScanBCClientCard
          extracted={extracted}
          clients={clients}
          matchedClient={matchedClient}
          formTiersId={formTiersId}
          onFormTiersId={onFormTiersId}
          createClient={createClient}
          onCreateClient={onCreateClient}
        />
      </div>

      <ScanBCLinesTable
        lines={extracted.lines}
        products={products}
        onAddLine={onAddLine}
        onRemoveLine={onRemoveLine}
        onUpdateLine={onUpdateLine}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Notes et Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formNotes}
              onChange={(e) => onFormNotes(e.target.value)}
              rows={3}
              placeholder="Instructions ou remarques du client..."
              className="text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Base HT</span>
              <MoneyInput value={totalHT} onChange={onTotalHT} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Remise totale</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatCurrency(String(computeRemiseTotale(extracted.lines)), "TND")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Total HT</span>
              <MoneyInput value={totalHT} onChange={onTotalHT} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">TVA</span>
              <MoneyInput value={totalTVA} onChange={onTotalTVA} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Timbre fiscal</span>
              <MoneyInput value={timbreFiscal} onChange={onTimbreFiscal} />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Total TTC</span>
              <MoneyInput value={totalTTC} onChange={onTotalTTC} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onReset} className="gap-1.5">
          <X className="h-3.5 w-3.5" /> Annuler
        </Button>
        <Button variant="secondary" onClick={onSaveDraft} disabled={isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Brouillon
        </Button>
        <Button onClick={handleConfirm} disabled={isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Confirmer
        </Button>
      </div>
    </div>
  )
}
