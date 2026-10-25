"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { notify } from "@/lib/notify";
import { companySetupSchema } from "@/lib/schemas/company";
import { useSetupCompany } from "@/hooks/use-companies";
import { Building2, Loader2 } from "lucide-react";

interface CompanySetupFormProps {
  ownerName: string;
  ownerEmail: string;
}

export function CompanySetupForm({ ownerName, ownerEmail }: CompanySetupFormProps) {
  const createCompany = useSetupCompany();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      matriculeFiscal: formData.get("matriculeFiscal") as string,
      adresse: formData.get("adresse") as string,
      ville: formData.get("ville") as string,
      codePostal: formData.get("codePostal") as string,
      telephone: formData.get("telephone") as string,
      email: formData.get("email") as string,
      siteWeb: formData.get("siteWeb") as string,
      ribBancaire: formData.get("ribBancaire") as string,
      banque: formData.get("banque") as string,
      type: formData.get("type") as string,
      devise: formData.get("devise") as string,
      tauxTVADefaut: formData.get("tauxTVADefaut") as string,
      tauxFodecDefaut: formData.get("tauxFodecDefaut") as string,
      prefixeFacture: formData.get("prefixeFacture") as string,
      prefixeDevis: formData.get("prefixeDevis") as string,
      prefixeBL: formData.get("prefixeBL") as string,
      anneeFormat: formData.get("anneeFormat") === "on",
    };

    const parsed = companySetupSchema.safeParse(payload);
    if (!parsed.success) {
      notify.warning({
        title: "Formulaire incomplet",
        description: parsed.error.issues[0]?.message ?? "Vérifiez les champs saisis.",
      });
      return;
    }

    createCompany.mutate(parsed.data);
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground">
          <Building2 className="h-6 w-6 text-background" />
        </div>
        <CardTitle className="text-xl">Configurer votre entreprise</CardTitle>
        <CardDescription>
          {ownerName} ({ownerEmail}) — Complétez les informations de votre société pour commencer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">
                Nom de l&apos;entreprise <span className="text-destructive">*</span>
              </Label>
              <Input id="name" name="name" placeholder="Ex : Société XYZ" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matriculeFiscal">Matricule fiscal</Label>
              <Input id="matriculeFiscal" name="matriculeFiscal" placeholder="0000000/A/A/M/000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="LOCALE">
                <SelectTrigger id="type">
                  <SelectValue placeholder="Type de société" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCALE">Locale</SelectItem>
                  <SelectItem value="OFFSHORE">Offshore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Textarea id="adresse" name="adresse" placeholder="Adresse complète" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" name="ville" placeholder="Tunis" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codePostal">Code postal</Label>
              <Input id="codePostal" name="codePostal" placeholder="1001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" name="telephone" placeholder="+216 00 000 000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="contact@societe.tn" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="siteWeb">Site web</Label>
              <Input id="siteWeb" name="siteWeb" placeholder="https://www.societe.tn" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ribBancaire">RIB bancaire</Label>
              <Input id="ribBancaire" name="ribBancaire" placeholder="08 000 0000000000000 00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banque">Banque</Label>
              <Input id="banque" name="banque" placeholder="Nom de la banque" />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="devise">Devise</Label>
              <Select name="devise" defaultValue="TND">
                <SelectTrigger id="devise">
                  <SelectValue placeholder="Devise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TND">TND — Dinar tunisien</SelectItem>
                  <SelectItem value="USD">USD — Dollar US</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tauxTVADefaut">TVA par défaut (%)</Label>
              <Input id="tauxTVADefaut" name="tauxTVADefaut" type="number" defaultValue="19" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tauxFodecDefaut">FODEC par défaut (%)</Label>
              <Input id="tauxFodecDefaut" name="tauxFodecDefaut" type="number" defaultValue="1" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefixeFacture">Préfixe factures</Label>
              <Input id="prefixeFacture" name="prefixeFacture" defaultValue="FAC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefixeDevis">Préfixe devis</Label>
              <Input id="prefixeDevis" name="prefixeDevis" defaultValue="DEV" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefixeBL">Préfixe bons de livraison</Label>
              <Input id="prefixeBL" name="prefixeBL" defaultValue="BL" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox id="anneeFormat" name="anneeFormat" defaultChecked />
                <span className="text-muted-foreground">Format année dans les numéros</span>
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createCompany.isPending}>
            {createCompany.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création de la société...
              </>
            ) : (
              "Créer ma société"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}