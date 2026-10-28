"use client"

import { useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { X, Loader2, StickyNote, Calculator } from "lucide-react"
import { formatCurrency } from "@/lib/decimal"
import { ScanBCFormCards, type Client } from "./scan-bc-form-cards"
import { ScanBCManualLinesTable, type ManualBCProduct } from "./scan-bc-manual-lines-table"
import { computeBCTotals, type BCManualLine } from "./scan-bc-totals"

interface Props {
  clients: Client[]
  products: ManualBCProduct[]
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
  const totals = useMemo(() => computeBCTotals(lines), [lines])

  return (
    <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
      <ScanBCFormCards
        clients={clients}
        formTiersId={formTiersId}
        onFormTiersId={onFormTiersId}
        formDate={formDate}
        onFormDate={onFormDate}
        formDateExpiration={formDateExpiration}
        onFormDateExpiration={onFormDateExpiration}
        formRefClient={formRefClient}
        onFormRefClient={onFormRefClient}
      />

      <ScanBCManualLinesTable
        lines={lines}
        products={products}
        onAddLine={onAddLine}
        onRemoveLine={onRemoveLine}
        onUpdateLine={onUpdateLine}
      />

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
