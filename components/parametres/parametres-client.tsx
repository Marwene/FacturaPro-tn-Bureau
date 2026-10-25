"use client"

import { useSettingsData, useSettingsMutations, useUnsavedChangesWarning } from "@/hooks/use-settings"
import { settingsSchema, type SettingsInput } from "@/lib/schemas"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { notify } from "@/lib/notify"
import { Save, Check, Building2, Phone, Receipt, Hash, Bell } from "lucide-react"
import { ParamSocieteTab } from "./param-societe-tab"
import { ParamContactTab } from "./param-contact-tab"
import { ParamFiscalTab } from "./param-fiscal-tab"
import { ParamNumerotationTab } from "./param-numerotation-tab"
import { ParamAlertesTab } from "./param-alertes-tab"

export function ParametresClient() {
  const { data, isLoading } = useSettingsData()
  const { updateSettings } = useSettingsMutations()

  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsInput>,
    values: data?.settings ? {
      raisonSociale: data.settings.raisonSociale,
      matriculeFiscal: data.settings.matriculeFiscal,
      adresse: data.settings.adresse,
      ville: data.settings.ville,
      codePostal: data.settings.codePostal,
      telephone: data.settings.telephone,
      email: data.settings.email,
      siteWeb: data.settings.siteWeb,
      ribBancaire: data.settings.ribBancaire,
      banque: data.settings.banque,
      tauxTVADefaut: parseFloat(data.settings.tauxTVADefaut) || 19,
      tauxFodecDefaut: parseFloat(data.settings.tauxFodecDefaut) || 1,
      prefixeFacture: data.settings.prefixeFacture,
      prefixeDevis: data.settings.prefixeDevis,
      prefixeBL: data.settings.prefixeBL,
      anneeFormat: data.settings.anneeFormat,
      alerteStockActif: data.settings.alerteStockActif,
      alerteEcheanceJours: data.settings.alerteEcheanceJours,
    } : undefined,
  })

  const isSaving = updateSettings.isPending
  const prefixeFacture = form.watch("prefixeFacture")
  const prefixeDevis = form.watch("prefixeDevis")
  const prefixeBL = form.watch("prefixeBL")
  const anneeFormat = form.watch("anneeFormat")

  useUnsavedChangesWarning(form.formState.isDirty)

  const year = new Date().getFullYear()
  const suffix = anneeFormat ? `-${year}-0001` : "-0001"
  const preview = {
    facture: `${prefixeFacture || "FAC"}${suffix}`,
    devis: `${prefixeDevis || "DEV"}${suffix}`,
    bl: `${prefixeBL || "BL"}${suffix}`,
  }

  const onSubmit = (values: SettingsInput) => {
    updateSettings.mutate(values, {
      onSuccess: () => {
        form.reset(values)
        notify.success({
          title: "Paramètres enregistrés",
          description: "Les prochains documents utiliseront ces valeurs.",
        })
      },
      onError: (err: unknown) =>
        notify.error({
          title: "Enregistrement des paramètres impossible",
          error: err,
          context: "lors de l'enregistrement des paramètres de l'entreprise",
          retry: () => updateSettings.mutate(values),
        }),
    })
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-9 max-w-lg rounded-lg" />
        <Skeleton className="h-64 max-w-2xl rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <Tabs defaultValue="societe" className="flex flex-col">
          <TabsList className="mb-4 self-start">
            <TabsTrigger value="societe" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Société</TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5 text-xs"><Phone className="h-3.5 w-3.5" />Contact</TabsTrigger>
            <TabsTrigger value="fiscal" className="gap-1.5 text-xs"><Receipt className="h-3.5 w-3.5" />Fiscal</TabsTrigger>
            <TabsTrigger value="numerotation" className="gap-1.5 text-xs"><Hash className="h-3.5 w-3.5" />Numérotation</TabsTrigger>
            <TabsTrigger value="alertes" className="gap-1.5 text-xs"><Bell className="h-3.5 w-3.5" />Alertes</TabsTrigger>
          </TabsList>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="societe"><ParamSocieteTab form={form} isSaving={isSaving} /></TabsContent>
            <TabsContent value="contact"><ParamContactTab form={form} isSaving={isSaving} /></TabsContent>
            <TabsContent value="fiscal"><ParamFiscalTab form={form} isSaving={isSaving} /></TabsContent>
            <TabsContent value="numerotation"><ParamNumerotationTab form={form} isSaving={isSaving} preview={preview} /></TabsContent>
            <TabsContent value="alertes"><ParamAlertesTab form={form} isSaving={isSaving} /></TabsContent>

            <Button type="submit" className="mt-4 gap-1.5 text-sm" disabled={isSaving || !form.formState.isDirty}>
              {isSaving ? "Enregistrement..." : <>{form.formState.isDirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}Enregistrer</>}
            </Button>
          </form>
        </Tabs>
      </div>
    </div>
  )
}
