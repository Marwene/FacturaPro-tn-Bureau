"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fournisseurSchema, type FournisseurInput } from "@/lib/schemas/fournisseur";
import { useFournisseursMutations } from "@/hooks/use-fournisseurs";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/shared/form-field";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { SerializedTiers } from "@/lib/types";

interface FournisseurDialogProps {
    fournisseur?: SerializedTiers;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FournisseurDialog({ fournisseur, open, onOpenChange }: FournisseurDialogProps) {
    const isEdit = !!fournisseur;
    const { createFournisseur, updateFournisseur } = useFournisseursMutations();
    const isPending = createFournisseur.isPending || updateFournisseur.isPending;

    const form = useForm<FournisseurInput>({
        resolver: zodResolver(fournisseurSchema) as Resolver<FournisseurInput>,
        defaultValues: {
            code: fournisseur?.code ?? "",
            raisonSociale: fournisseur?.raisonSociale ?? "",
            matriculeFiscal: fournisseur?.matriculeFiscal ?? "",
            adresse: fournisseur?.adresse ?? "",
            ville: fournisseur?.ville ?? "",
            codePostal: fournisseur?.codePostal ?? "",
            telephone: fournisseur?.telephone ?? "",
            email: fournisseur?.email ?? "",
            siteWeb: fournisseur?.siteWeb ?? "",
            contactNom: fournisseur?.contactNom ?? "",
            contactFonction: fournisseur?.contactFonction ?? "",
            notes: fournisseur?.notes ?? "",
            actif: fournisseur?.actif ?? true,
            isClient: fournisseur?.isClient ?? false,
        },
    });

    const onSubmit = (data: FournisseurInput) => {
        if (isEdit && fournisseur) {
            updateFournisseur.mutate(
                { id: fournisseur.id, ...data },
                {
                    onSuccess: () => {
                        notify.success({ title: `Fournisseur ${fournisseur.raisonSociale} mis à jour` });
                        form.reset();
                        onOpenChange(false);
                    },
                    onError: (err) => notify.error({ title: "Mise à jour impossible", error: err, context: "mise à jour du fournisseur" }),
                },
            );
        } else {
            createFournisseur.mutate(data, {
                onSuccess: () => {
                    notify.success({ title: `Fournisseur ${data.raisonSociale} créé` });
                    form.reset();
                    onOpenChange(false);
                },
                onError: (err) => notify.error({ title: "Fournisseur non créé", error: err, context: "création du fournisseur" }),
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-sm font-semibold">
                        {isEdit ? "Modifier le Fournisseur" : "Nouveau Fournisseur"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                            label="Code"
                            required
                            error={form.formState.errors.code?.message}
                            className="gap-1"
                        >
                            <Input
                                {...form.register("code")}
                                className="h-8 text-sm"
                                placeholder="FO, AC, ..."
                                aria-invalid={!!form.formState.errors.code}
                            />
                        </FormField>
                        <FormField
                            label="Raison Sociale"
                            required
                            error={form.formState.errors.raisonSociale?.message}
                            className="gap-1"
                        >
                            <Input
                                {...form.register("raisonSociale")}
                                className="h-8 text-sm"
                                aria-invalid={!!form.formState.errors.raisonSociale}
                            />
                        </FormField>
                        <FormField label="Matricule Fiscal" className="gap-1">
                            <Input
                                {...form.register("matriculeFiscal")}
                                className="h-8 text-sm font-mono"
                                placeholder="1234567/A/M/000"
                            />
                        </FormField>
                        <FormField label="Téléphone" className="gap-1">
                            <Input
                                {...form.register("telephone")}
                                className="h-8 text-sm"
                                placeholder="+216 71 234 567"
                            />
                        </FormField>
                        <FormField label="Email" className="gap-1">
                            <Input {...form.register("email")} type="email" className="h-8 text-sm" />
                        </FormField>
                        <FormField label="Site Web" className="gap-1">
                            <Input {...form.register("siteWeb")} className="h-8 text-sm" />
                        </FormField>
                        <FormField label="Adresse" className="gap-1">
                            <Input {...form.register("adresse")} className="h-8 text-sm" />
                        </FormField>
                        <FormField label="Ville" className="gap-1">
                            <Input {...form.register("ville")} className="h-8 text-sm" />
                        </FormField>
                        <FormField label="Code Postal" className="gap-1">
                            <Input {...form.register("codePostal")} className="h-8 text-sm" />
                        </FormField>
                        <FormField label="Nom du Contact" className="gap-1">
                            <Input {...form.register("contactNom")} className="h-8 text-sm" placeholder="Personne à contacter" />
                        </FormField>
                        <FormField label="Fonction du Contact" className="gap-1">
                            <Input {...form.register("contactFonction")} className="h-8 text-sm" placeholder="Directeur, comptable, ..." />
                        </FormField>
                    </div>

                    <Separator />
                    <FormField label="Notes" className="gap-1">
                        <Input {...form.register("notes")} className="h-8 text-sm" />
                    </FormField>

                    <Separator />
                    <div className="flex items-center gap-3">
                        <Switch checked={form.watch("isClient")} onCheckedChange={(v) => form.setValue("isClient", v)} />
                        <Label className="text-xs">Est aussi un client</Label>
                    </div>

                    {isEdit && (
                        <>
                            <Separator />
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={form.watch("actif")}
                                    onCheckedChange={(v) => form.setValue("actif", v)}
                                />
                                <Label className="text-xs">
                                    {form.watch("actif") ? "Actif" : "Inactif"}
                                </Label>
                            </div>
                        </>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" size="sm" disabled={isPending}>
                            {isPending ? (isEdit ? "Mise à jour..." : "Création...") : isEdit ? "Mettre à jour" : "Créer le Fournisseur"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
