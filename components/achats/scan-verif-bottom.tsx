"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Send, Loader2 } from "lucide-react"
import { parseTunisianNumber } from "@/lib/decimal"

function formatInputNumber(v: string): string {
  if (!v) return ""
  const n = parseTunisianNumber(v)
  if (Number.isNaN(n)) return v
  return n.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0").replace(".", ",")
}

function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <Input
      type="text" inputMode="decimal"
      value={focused ? value : formatInputNumber(value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-28 text-right text-xs"
    />
  )
}

export function ScanVerifBottom({
  notes, timbreFiscal, totalHT, totalTVA, totalTTC, isPending,
  onNotesChange, onTimbreChange, onTotalHTChange, onTotalTVAChange, onTotalTTCChange, onReset, onConfirm,
}: {
  notes: string
  timbreFiscal: string
  totalHT: string
  totalTVA: string
  totalTTC: string
  isPending: boolean
  onNotesChange: (val: string) => void
  onTimbreChange: (val: string) => void
  onTotalHTChange: (val: string) => void
  onTotalTVAChange: (val: string) => void
  onTotalTTCChange: (val: string) => void
  onReset: () => void
  onConfirm: () => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => onNotesChange(e.target.value)}
              className="text-sm resize-none h-24" placeholder="Notes additionnelles..." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex justify-between text-xs items-center gap-2">
              <span className="text-muted-foreground">Total HT</span>
              <MoneyInput value={totalHT} onChange={onTotalHTChange} />
            </div>
            <div className="flex justify-between text-xs items-center gap-2">
              <span className="text-muted-foreground">TVA</span>
              <MoneyInput value={totalTVA} onChange={onTotalTVAChange} />
            </div>
            <div className="flex justify-between text-xs items-center gap-2">
              <span className="text-muted-foreground">Timbre fiscal</span>
              <MoneyInput value={timbreFiscal} onChange={onTimbreChange} />
            </div>
            <Separator />
            <div className="flex justify-between text-xs items-center gap-2">
              <span className="text-sm font-bold">Total TTC</span>
              <MoneyInput value={totalTTC} onChange={onTotalTTCChange} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={onReset}>
          <ArrowLeft className="h-3.5 w-3.5" /> Nouveau scan
        </Button>
        <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={onConfirm} disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {isPending ? "Création..." : "Confirmer l'Achat"}
        </Button>
      </div>
    </>
  )
}
