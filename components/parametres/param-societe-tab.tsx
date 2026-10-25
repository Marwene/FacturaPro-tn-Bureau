"use client"

import type { UseFormReturn } from "react-hook-form"
import type { SettingsInput } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function ParamSocieteTab({ form, isSaving }: { form: UseFormReturn<SettingsInput>; isSaving: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Informations de la Société</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Identité et adresse — affichés sur vos documents fiscaux</p>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs text-muted-foreground">Raison Sociale *</Label>
              <Input {...form.register("raisonSociale")} className="h-9 text-sm" placeholder="Nom de votre entreprise" disabled={isSaving} />
              {form.formState.errors.raisonSociale && <p className="text-xs text-red-500">{form.formState.errors.raisonSociale.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Matricule Fiscal</Label>
              <Input {...form.register("matriculeFiscal")} className="h-9 text-sm font-mono" placeholder="12345678/A" disabled={isSaving} />
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Adresse</Label>
              <Input {...form.register("adresse")} className="h-9 text-sm" placeholder="Rue, numéro, étage" disabled={isSaving} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ville</Label>
                <Input {...form.register("ville")} className="h-9 text-sm" placeholder="Tunis" disabled={isSaving} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Code Postal</Label>
                <Input {...form.register("codePostal")} className="h-9 text-sm" placeholder="1000" disabled={isSaving} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
