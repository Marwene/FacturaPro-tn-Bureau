"use client"

import type { UseFormReturn } from "react-hook-form"
import type { SettingsInput } from "@/lib/schemas"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Controller } from "react-hook-form"

export function ParamAlertesTab({ form, isSaving }: { form: UseFormReturn<SettingsInput>; isSaving: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Alertes et Notifications</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Seuils et notifications proactives</p>
        </div>
        <Separator />
        <Controller
          control={form.control}
          name="alerteStockActif"
          render={({ field }) => (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Alerte stock critique</p>
                <p className="text-xs text-muted-foreground">Alerter quand le stock est en dessous du minimum</p>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
            </div>
          )}
        />
        <Separator />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Alerter avant l&apos;échéance (jours)</Label>
          <Input {...form.register("alerteEcheanceJours")} type="number" min="1" max="90" className="h-9 text-sm w-32" disabled={isSaving} />
        </div>
      </CardContent>
    </Card>
  )
}
