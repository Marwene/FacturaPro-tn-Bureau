"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import {
    useCompanyBankAccounts,
    useCreateCompanyBankAccount,
    useUpdateCompanyBankAccount,
    useDeleteCompanyBankAccount,
} from "@/hooks/use-company-bank-accounts";
import { useCompany } from "@/hooks/use-company-query";
import { ArrowLeft, Plus, Pencil, Trash2, Building2, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import type { SerializedCompanyBankAccount } from "@/lib/types";

export function EntrepriseBanquesClient({ companyId }: { companyId: string }) {
    const [showDialog, setShowDialog] = useState(false);
    const [editing, setEditing] = useState<SerializedCompanyBankAccount | null>(null);
    const [nomBanque, setNomBanque] = useState("");
    const [rib, setRib] = useState("");
    const [agence, setAgence] = useState("");
    const [isDefault, setIsDefault] = useState(false);

    const { data, isLoading } = useCompanyBankAccounts(companyId);
    const { data: companyData } = useCompany(companyId);

    const createMutation = useCreateCompanyBankAccount(companyId);
    const updateMutation = useUpdateCompanyBankAccount(companyId);
    const deleteMutation = useDeleteCompanyBankAccount(companyId);

    const resetDialog = () => {
        setShowDialog(false);
        setEditing(null);
        setNomBanque("");
        setRib("");
        setAgence("");
        setIsDefault(false);
    };

    const openEdit = (acc: SerializedCompanyBankAccount) => {
        setEditing(acc);
        setNomBanque(acc.nomBanque);
        setRib(acc.rib ?? "");
        setAgence(acc.agence ?? "");
        setIsDefault(acc.isDefault);
        setShowDialog(true);
    };

    const handleSubmit = () => {
        if (!nomBanque.trim()) { notify.error({ title: "Compte bancaire non enregistré", error: "Le nom de la banque est requis." }); return; }
        const payload = { nomBanque: nomBanque.trim(), rib: rib.trim() || null, agence: agence.trim() || null, isDefault };
        if (editing) {
            updateMutation.mutate(
                { id: editing.id, ...payload },
                {
                    onSuccess: () => {
                        notify.success({ title: `Compte bancaire « ${nomBanque.trim()} » mis à jour` });
                        resetDialog();
                    },
                    onError: (err: unknown) =>
                        notify.error({ title: "Compte bancaire non modifié", error: err, context: "mise à jour du compte bancaire" }),
                },
            );
        } else {
            createMutation.mutate(payload, {
                onSuccess: () => {
                    notify.success({ title: `Compte bancaire « ${nomBanque.trim()} » créé` });
                    resetDialog();
                },
                onError: (err: unknown) =>
                    notify.error({ title: "Compte bancaire non créé", error: err, context: "création du compte bancaire" }),
            });
        }
    };

    const accounts = data?.accounts ?? [];
    const companyName = companyData?.company?.name ?? "Chargement...";

    return (
        <div className="p-4 max-w-3xl space-y-4">
            <Link
                href={`/parametres/entreprises/${companyId}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à {companyName}
            </Link>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">Comptes bancaires</h1>
                    <p className="text-xs text-muted-foreground">{companyName}</p>
                </div>
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowDialog(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un compte
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-lg" />
                    ))}
                </div>
            ) : accounts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Building2 className="h-10 w-10 mb-3" />
                        <p className="text-sm font-medium">Aucun compte bancaire</p>
                        <p className="text-xs mt-1">Ajoutez un compte bancaire pour cette société.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {accounts.map((acc) => (
                        <Card key={acc.id} className={acc.isDefault ? "ring-1 ring-primary/30" : ""}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm font-medium">{acc.nomBanque}</p>
                                            {acc.isDefault && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                                    <Check className="h-3 w-3" /> Par défaut
                                                </span>
                                            )}
                                        </div>
                                        {acc.rib && <p className="text-xs font-mono text-muted-foreground">RIB: {acc.rib}</p>}
                                        {acc.agence && <p className="text-xs text-muted-foreground">Agence: {acc.agence}</p>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(acc)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-500"
                                            onClick={() =>
                                                deleteMutation.mutate(acc.id, {
                                                    onSuccess: () => notify.success({ title: "Compte bancaire supprimé" }),
                                                    onError: (err: unknown) =>
                                                        notify.error({
                                                            title: "Suppression impossible",
                                                            error: err,
                                                            context: "suppression du compte bancaire",
                                                        }),
                                                })
                                            }
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showDialog} onOpenChange={(o) => { if (!o) resetDialog(); }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Modifier" : "Ajouter"} un compte bancaire</DialogTitle>
                        <DialogDescription>
                            {editing ? "Modifiez les informations du compte bancaire" : "Ajoutez un nouveau compte bancaire à cette société"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">Nom de la banque *</Label>
                            <Input className="h-8 text-sm" value={nomBanque} onChange={(e) => setNomBanque(e.target.value)} placeholder="e.g. BIAT, Amen Bank..." />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">RIB</Label>
                            <Input className="h-8 text-sm font-mono" value={rib} onChange={(e) => setRib(e.target.value)} placeholder="e.g. TN59 1000 1234 5678 9012 3456" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label className="text-xs">Agence</Label>
                            <Input className="h-8 text-sm" value={agence} onChange={(e) => setAgence(e.target.value)} placeholder="e.g. Tunis" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="isDefault" checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} />
                            <Label htmlFor="isDefault" className="text-xs cursor-pointer">Compte par défaut</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={resetDialog}>Annuler</Button>
                        <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : editing ? "Enregistrer" : "Ajouter"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
