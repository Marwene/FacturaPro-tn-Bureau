"use client"

import type { UseFormReturn } from "react-hook-form"
import type { SettingsInput } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function ParamFiscalTab({ form, isSaving }: { form: UseFormReturn<SettingsInput>; isSaving: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Paramètres Fiscaux</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Taux par défaut appliqués aux nouvelles lignes de facturation</p>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Taux TVA par défaut (%)</Label>
            <Input {...form.register("tauxTVADefaut")} type="number" step="0.01" min="0" max="100" className="h-9 text-sm" disabled={isSaving} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Taux FODEC par défaut (%)</Label>
            <Input {...form.register("tauxFodecDefaut")} type="number" step="0.01" min="0" max="100" className="h-9 text-sm" disabled={isSaving} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
