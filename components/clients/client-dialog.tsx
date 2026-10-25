"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { tiersSchema } from "@/lib/schemas";
import { useClientMutations } from "@/hooks/use-clients";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/shared/form-field";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SerializedTiers } from "@/lib/types";

interface ClientDialogProps {
    client?: SerializedTiers;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ClientDialog({ client, open, onOpenChange }: ClientDialogProps) {
    const isEdit = !!client;
    const { createClient, updateClient } = useClientMutations();
    const isPending = createClient.isPending || updateClient.isPending;

    const form = useForm<z.input<typeof tiersSchema>>({
        resolver: zodResolver(tiersSchema),
        defaultValues: {
            code: client?.code ?? "", raisonSociale: client?.raisonSociale ?? "",
            matriculeFiscal: client?.matriculeFiscal ?? "", adresse: client?.adresse ?? "",
            ville: client?.ville ?? "", codePostal: client?.codePostal ?? "",
            telephone: client?.telephone ?? "", email: client?.email ?? "",
            siteWeb: client?.siteWeb ?? "",             assujettTVA: client?.assujettTVA ?? true,
            exonereTVA: client?.exonereTVA ?? false, isFournisseur: client?.isFournisseur ?? false, tauxRetenue: client ? parseFloat(client.tauxRetenue) : 0,
            ribBancaire: client?.ribBancaire ?? "", banque: client?.banque ?? "",
            notes: client?.notes ?? "", actif: client?.actif ?? true,
        },
    });

    const onSubmit = (data: z.input<typeof tiersSchema>) => {
        const onSuccess = () => {
            notify.success({
                title: isEdit && client ? `Client ${client.raisonSociale} mis à jour` : `Client ${data.raisonSociale} créé`,
            });
            form.reset();
            onOpenChange(false);
        };
        const mappedData: Partial<SerializedTiers> = {
            ...data,
            tauxRetenue: String(data.tauxRetenue ?? 0),
        };
        if (isEdit && client) {
            updateClient.mutate({ id: client.id, data: mappedData }, { onSuccess, onError: (err) => notify.error({ title: "Mise à jour impossible", error: err, context: "mise à jour du client" }) });
        } else {
            createClient.mutate(data, { onSuccess, onError: (err) => notify.error({ title: "Client non créé", error: err, context: "création du client" }) });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-sm font-semibold">{isEdit ? "Modifier le Client" : "Nouveau Client"}</DialogTitle></DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                            label="Code"
                            required
                            error={form.formState.errors.code?.message}
                            className="gap-1"
                        >
                            <Input {...form.register("code")} className="h-8 text-sm" placeholder="SO, DI, ..." />
                        </FormField>
                        <FormField
                            label="Raison Sociale"
                            required
                            error={form.formState.errors.raisonSociale?.message}
                            className="gap-1"
                        >
                            <Input {...form.register("raisonSociale")} className="h-8 text-sm" />
                        </FormField>
                        <FormField label="Matricule Fiscal" className="gap-1">
                            <Input {...form.register("matriculeFiscal")} className="h-8 text-sm font-mono" placeholder="1234567/A/M/000" />
                        </FormField>
                        <FormField label="Téléphone" className="gap-1">
                            <Input {...form.register("telephone")} className="h-8 text-sm" placeholder="+216 71 234 567" />
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
                        <FormField label="Taux Retenue Source (%)" className="gap-1">
                            <Input {...form.register("tauxRetenue")} type="number" step="0.1" min="0" max="100" className="h-8 text-sm" />
                        </FormField>
                    </div>

                    <Separator />
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paramètres Fiscaux</h4>
                        <div className="flex items-center gap-3"><Switch checked={form.watch("assujettTVA")} onCheckedChange={(v) => form.setValue("assujettTVA", v)} /><Label className="text-xs">Assujetti à la TVA</Label></div>
                        <div className="flex items-center gap-3"><Switch checked={form.watch("exonereTVA")} onCheckedChange={(v) => form.setValue("exonereTVA", v)} /><Label className="text-xs">Exonéré de TVA</Label></div>
                        <div className="flex items-center gap-3"><Switch checked={form.watch("isFournisseur")} onCheckedChange={(v) => form.setValue("isFournisseur", v)} /><Label className="text-xs">Est aussi un fournisseur</Label></div>
                    </div>

                    <Separator />
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Devise</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Devise principale" className="gap-1">
                                <Select value={form.watch("devise")} onValueChange={(v) => form.setValue("devise", v)}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TND">TND (Dinar Tunisien)</SelectItem>
                                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                        <SelectItem value="USD">USD (Dollar US)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField label="Devise secondaire" className="gap-1">
                                <Select value={form.watch("deviseSecondaire") ?? "NONE"} onValueChange={(v) => form.setValue("deviseSecondaire", v === "NONE" ? null : v)}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Aucune" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">Aucune</SelectItem>
                                        <SelectItem value="TND">TND (Dinar Tunisien)</SelectItem>
                                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                        <SelectItem value="USD">USD (Dollar US)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                        </div>
                    </div>

                    {isEdit && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</h4>
                                <div className="flex items-center gap-3">
                                    <Switch checked={form.watch("actif")} onCheckedChange={(v) => form.setValue("actif", v)} />
                                    <Label className="text-xs">{form.watch("actif") ? "Actif" : "Inactif"}</Label>
                                </div>
                            </div>
                        </>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" size="sm" disabled={isPending}>
                            {isPending ? (isEdit ? "Mise à jour..." : "Création...") : (isEdit ? "Mettre à jour" : "Créer le Client")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
