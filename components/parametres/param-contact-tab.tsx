"use client"

import type { UseFormReturn } from "react-hook-form"
import type { SettingsInput } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function ParamContactTab({ form, isSaving }: { form: UseFormReturn<SettingsInput>; isSaving: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Contact & Banque</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Coordonnées et informations bancaires</p>
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Téléphone</Label>
            <Input {...form.register("telephone")} className="h-9 text-sm" placeholder="+216 XX XXX XXX" disabled={isSaving} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input {...form.register("email")} type="email" className="h-9 text-sm" placeholder="contact@entreprise.tn" disabled={isSaving} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Site Web</Label>
            <Input {...form.register("siteWeb")} className="h-9 text-sm" placeholder="www.entreprise.tn" disabled={isSaving} />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">RIB Bancaire</Label>
            <Input {...form.register("ribBancaire")} className="h-9 text-sm font-mono" placeholder="08 001 0000 1234567890 12" disabled={isSaving} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Banque</Label>
            <Input {...form.register("banque")} className="h-9 text-sm" placeholder="Banque de Tunisie" disabled={isSaving} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
