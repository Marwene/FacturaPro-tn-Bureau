"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { useCompany } from "@/hooks/use-company-query";
import { useUpdateCompany } from "@/hooks/use-companies";
import { Save, Loader2 } from "lucide-react";

export function FacturationSettingsClient() {
    const { data: session } = useSession();
    const companyId = (session?.user as { companyId?: string })?.companyId;

    const { data, isLoading } = useCompany(companyId ?? null);
    const updateMutation = useUpdateCompany(companyId ?? "");

    const onSaved = () =>
        notify.success({
            title: "Paramètres de facturation mis à jour",
            description: "Les prochains documents utiliseront ces valeurs.",
        });
    const onSaveFailed = (err: unknown) =>
        notify.error({
            title: "Enregistrement des paramètres impossible",
            error: err,
            context: "lors de la mise à jour des paramètres de facturation",
        });

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 rounded-lg" />
            </div>
        );
    }

    const company = data?.company;

    return (
        <div className="p-4 max-w-2xl space-y-4">
            <div>
                <h1 className="text-lg font-semibold">Facturation</h1>
                <p className="text-xs text-muted-foreground">
                    Paramètres de numérotation et taux par défaut
                </p>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateMutation.mutate(
                        {
                            prefixeFacture: formData.get("prefixeFacture") as string,
                            prefixeDevis: formData.get("prefixeDevis") as string,
                            prefixeBL: formData.get("prefixeBL") as string,
                            tauxTVADefaut: parseFloat(formData.get("tauxTVADefaut") as string),
                            tauxFodecDefaut: parseFloat(formData.get("tauxFodecDefaut") as string),
                        },
                        { onSuccess: onSaved, onError: onSaveFailed },
                    );
                }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Numérotation</CardTitle>
                        <CardDescription>Préfixes des documents</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Préfixe Facture</Label>
                                <Input name="prefixeFacture" defaultValue={company?.prefixeFacture} className="h-9 text-sm font-mono uppercase" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Préfixe Devis</Label>
                                <Input name="prefixeDevis" defaultValue={company?.prefixeDevis} className="h-9 text-sm font-mono uppercase" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Préfixe B.L.</Label>
                                <Input name="prefixeBL" defaultValue={company?.prefixeBL} className="h-9 text-sm font-mono uppercase" />
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Taux TVA par défaut (%)</Label>
                                <Input name="tauxTVADefaut" type="number" step="0.01" defaultValue={company?.tauxTVADefaut} className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Taux FODEC par défaut (%)</Label>
                                <Input name="tauxFodecDefaut" type="number" step="0.01" defaultValue={company?.tauxFodecDefaut} className="h-9 text-sm" />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" size="sm" className="gap-1.5 text-xs" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Enregistrer
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
