"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Loader2, Trash2, Building2, Globe, Landmark } from "lucide-react";
import Link from "next/link";
import { notify } from "@/lib/notify";
import { companyUpdateSchema } from "@/lib/schemas/company";
import { CompanyLogoUpload } from "@/components/entreprises/company-logo-upload";
import { useCompany } from "@/hooks/use-company-query";
import { useUpdateCompany, useDeleteCompany } from "@/hooks/use-companies";

export function EntrepriseDetailClient({ companyId }: { companyId: string }) {
  const { data, isLoading } = useCompany(companyId);
  const updateMutation = useUpdateCompany(companyId);
  const deleteMutation = useDeleteCompany(companyId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // `data` est désormais typé par `useCompany` (l'ancien code inline renvoyait un
  // `res.json()` non typé) : on retire `undefined` du type, la suite du composant
  // déréférençant `company` sans garde depuis toujours (comportement inchangé).
  const company = data!.company;
  const isOffshore = (company?.type ?? "LOCALE") === "OFFSHORE";
  const devise = company?.devise ?? "TND";

  return (
    <div className="p-4 max-w-2xl space-y-4">
      <Link
        href="/parametres/entreprises"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour à la liste
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{company.name}</h1>
          <p className="text-xs text-muted-foreground">
            {company._count.invoices} factures · {company._count.users} utilisateurs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
            <Link href={`/parametres/entreprises/${companyId}/banques`}>
              <Landmark className="h-3.5 w-3.5" />
              Comptes bancaires
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </Button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const parsed = companyUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
          if (!parsed.success) {
            notify.warning({
              title: "Formulaire incomplet",
              description: parsed.error.issues[0]?.message ?? "Vérifiez les champs saisis.",
            });
            return;
          }
          updateMutation.mutate(parsed.data, {
            onSuccess: () =>
              notify.success({
                title: "Entreprise mise à jour",
                description: "Les prochains documents utiliseront ces informations.",
              }),
            onError: (err: unknown) =>
              notify.error({
                title: "Mise à jour de l'entreprise impossible",
                error: err,
                context: "lors de la mise à jour de l'entreprise",
              }),
          });
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
            <CardDescription>Identité et configuration de l&apos;entreprise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-6">
              <CompanyLogoUpload companyId={companyId} logo={company?.logo ?? null} />

              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <Input name="name" defaultValue={company.name} className="h-9 text-sm" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select name="type" defaultValue={company.type ?? "LOCALE"}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOCALE">
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" /> Locale
                          </span>
                        </SelectItem>
                        <SelectItem value="OFFSHORE">
                          <span className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" /> Offshore
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Devise {isOffshore ? "par défaut" : ""}
                    </Label>
                    <div className="flex h-9 items-center px-3 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground">
                      {devise === "TND" ? "TND (Dinars)" : "EUR (Euros)"}
                    </div>
                    <input type="hidden" name="devise" value={devise} />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Matricule Fiscal</Label>
                <Input name="matriculeFiscal" defaultValue={company.matriculeFiscal} className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input name="email" type="email" defaultValue={company.email} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Téléphone</Label>
                <Input name="telephone" defaultValue={company.telephone} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Site Web</Label>
                <Input name="siteWeb" defaultValue={company.siteWeb} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs text-muted-foreground">Adresse</Label>
                <Input name="adresse" defaultValue={company.adresse} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ville</Label>
                <Input name="ville" defaultValue={company.ville} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Code Postal</Label>
                <Input name="codePostal" defaultValue={company.codePostal} className="h-9 text-sm" />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">RIB Bancaire</Label>
                <Input name="ribBancaire" defaultValue={company.ribBancaire} className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Banque</Label>
                <Input name="banque" defaultValue={company.banque} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Seuil de split d&apos;effet (DT)</Label>
                <Input name="seuilSplitEffet" type="number" step="0.001" defaultValue={company.seuilSplitEffet ?? "11500"} className="h-9 text-sm" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
