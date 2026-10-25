"use client"

import { useInvoiceFormStore } from "@/lib/stores/invoices-store"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/form-field"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function InvoiceFormBcVise() {
  const form = useInvoiceFormStore()

  return (
    <div className="col-span-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold">BC Visé Sous Douane</CardTitle>
          <Switch checked={form.bcViseActif} onCheckedChange={form.setBcViseActif} />
        </CardHeader>
        {form.bcViseActif && (
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
          <FormField label="N° SN" className="gap-1">
            <Input value={form.bcViseNumero} onChange={(e) => form.setBcViseNumero(e.target.value)} className="h-8 text-sm" placeholder="N° SN" />
          </FormField>
          <FormField label="Date SN" className="gap-1">
            <Input type="date" value={form.dateSN} onChange={(e) => form.setDateSN(e.target.value)} className="h-8 text-sm" />
          </FormField>
          <FormField label="Poids Brut (kg)" className="gap-1">
            <Input type="text" inputMode="decimal" value={form.poidsBrut} onChange={(e) => form.setPoidsBrut(e.target.value)} className="h-8 text-sm" placeholder="0.00" />
          </FormField>
          <FormField label="Poids Net (kg)" className="gap-1">
            <Input type="text" inputMode="decimal" value={form.poids} onChange={(e) => form.setPoids(e.target.value)} className="h-8 text-sm" placeholder="0.00" />
          </FormField>
          <FormField label="Nb Colis" className="gap-1">
            <Input type="text" inputMode="numeric" value={form.nbColis} onChange={(e) => form.setNbColis(e.target.value)} className="h-8 text-sm" placeholder="0" />
          </FormField>
          <FormField label="Devise" className="gap-1">
            <Select value={form.devise} onValueChange={form.setDevise}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["TND", "EUR", "USD"].map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Taux de Change" className="gap-1">
            <Input type="text" inputMode="decimal" value={form.tauxChange} onChange={(e) => form.setTauxChange(e.target.value)} className="h-8 text-sm" placeholder="1.0000" />
          </FormField>
          <FormField label="Montant en TND" className="gap-1">
            <Input type="text" inputMode="decimal" value={form.montantTND} onChange={(e) => form.setMontantTND(e.target.value)} className="h-8 text-sm" placeholder="0.000" />
          </FormField>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
