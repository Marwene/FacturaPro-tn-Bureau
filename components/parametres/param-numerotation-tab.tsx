"use client"

import type { UseFormReturn } from "react-hook-form"
import type { SettingsInput } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Controller } from "react-hook-form"
import { FileText } from "lucide-react"

export function ParamNumerotationTab({ form, isSaving, preview }: {
  form: UseFormReturn<SettingsInput>
  isSaving: boolean
  preview: { facture: string; devis: string; bl: string }
}) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Numérotation des Documents</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Préfixes et format des numéros automatiques</p>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Préfixe Facture</Label>
            <Input {...form.register("prefixeFacture")} className="h-9 text-sm font-mono uppercase" placeholder="FAC" disabled={isSaving} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Préfixe Devis</Label>
            <Input {...form.register("prefixeDevis")} className="h-9 text-sm font-mono uppercase" placeholder="DEV" disabled={isSaving} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Préfixe Bon de Livraison</Label>
            <Input {...form.register("prefixeBL")} className="h-9 text-sm font-mono uppercase" placeholder="BL" disabled={isSaving} />
          </div>
        </div>

        <Controller
          control={form.control}
          name="anneeFormat"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
              <Label className="text-xs">Inclure l&apos;année dans la numérotation</Label>
            </div>
          )}
        />

        <Separator />
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Aperçu</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Facture:</span>
              <span className="font-mono font-medium">{preview.facture}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Devis:</span>
              <span className="font-mono font-medium">{preview.devis}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">B.L.:</span>
              <span className="font-mono font-medium">{preview.bl}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
