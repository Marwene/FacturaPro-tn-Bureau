"use client"

import { useBLFormStore } from "@/lib/stores/bl-store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function BLFormVise() {
  const form = useBLFormStore()

  return (
    <div className="col-span-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">BL Visé Sous Douane</CardTitle>
          <Switch checked={form.blViseActif} onCheckedChange={(v) => {
            form.setBlViseActif(v)
            if (v) {
              form.lines.forEach((l) => {
                if (l.tauxTVA !== "0") form.updateLine(l.id, { tauxTVA: "0" })
              })
            }
          }} />
        </CardHeader>
        {form.blViseActif && (
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">N° SN</Label>
                <Input value={form.snNumero} onChange={(e) => form.setSnNumero(e.target.value)} className="h-8 text-sm" placeholder="N° SN" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Date SN</Label>
                <Input type="date" value={form.dateSN} onChange={(e) => form.setDateSN(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Poids Brut (kg)</Label>
                <Input type="text" inputMode="decimal" value={form.poidsBrut} onChange={(e) => form.setPoidsBrut(e.target.value)} className="h-8 text-sm" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Poids Net (kg)</Label>
                <Input type="text" inputMode="decimal" value={form.poidsNet} onChange={(e) => form.setPoidsNet(e.target.value)} className="h-8 text-sm" placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Nb Colis</Label>
                <Input type="text" inputMode="numeric" value={form.nbColis} onChange={(e) => form.setNbColis(e.target.value)} className="h-8 text-sm" placeholder="0" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Devise</Label>
                <Select value={form.devise} onValueChange={form.setDevise}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["TND", "EUR", "USD"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Taux de Change</Label>
                <Input type="text" inputMode="decimal" value={form.tauxChange} onChange={(e) => form.setTauxChange(e.target.value)} className="h-8 text-sm" placeholder="1.0000" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Montant en TND</Label>
                <Input type="text" inputMode="decimal" value={form.montantTND} onChange={(e) => form.setMontantTND(e.target.value)} className="h-8 text-sm" placeholder="0.000" />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
