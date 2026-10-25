"use client";

import { useState } from "react";
import { useNgpCodes, useCreateNgpCode, useUpdateNgpCode, useDeleteNgpCode } from "@/hooks/use-queries";
import { DataTable } from "@/components/data-table";
import { BarcodeDisplay } from "@/components/barcode-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { ngpCodeCreateSchema, ngpCodeUpdateSchema } from "@/lib/schemas/ngp-code";
import { ConfirmDialog } from "@/components/confirm-delete-dialog";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedNgpCode } from "@/lib/types";

export function NgpSettingsClient() {
    const { data, isLoading, isFetching } = useNgpCodes();
    const createNgp = useCreateNgpCode();
    const updateNgp = useUpdateNgpCode();
    const deleteNgp = useDeleteNgpCode();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCode, setEditCode] = useState("");
    const [editDesc, setEditDesc] = useState("");

    const [newCode, setNewCode] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [deletingCode, setDeletingCode] = useState<SerializedNgpCode | null>(null);

    const startEdit = (item: SerializedNgpCode) => {
        setEditingId(item.id);
        setEditCode(item.code);
        setEditDesc(item.description ?? "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditCode("");
        setEditDesc("");
    };

    const saveEdit = (id: string) => {
        const parsed = ngpCodeUpdateSchema.safeParse({ code: editCode, description: editDesc || null });
        if (!parsed.success) {
            notify.warning({
                title: "Formulaire incomplet",
                description: parsed.error.issues[0]?.message ?? "Vérifiez les champs saisis.",
            });
            return;
        }
        updateNgp.mutate(
            { id, code: parsed.data.code, description: parsed.data.description ?? null },
            {
                onSuccess: () => {
                    notify.success({ title: `Code NGP « ${editCode} » modifié` });
                    cancelEdit();
                },
                onError: (err: unknown) =>
                    notify.error({
                        title: "Modification du code NGP impossible",
                        error: err,
                        context: "lors de la modification d'un code NGP",
                        retry: () => saveEdit(id),
                    }),
            }
        );
    };

    const handleCreate = () => {
        const parsed = ngpCodeCreateSchema.safeParse({ code: newCode.trim(), description: newDesc.trim() || null });
        if (!parsed.success) {
            notify.warning({
                title: "Formulaire incomplet",
                description: parsed.error.issues[0]?.message ?? "Vérifiez les champs saisis.",
            });
            return;
        }
        createNgp.mutate(
            { code: parsed.data.code, description: parsed.data.description ?? null },
            {
                onSuccess: () => {
                    notify.success({ title: `Code NGP « ${newCode.trim()} » créé` });
                    setNewCode("");
                    setNewDesc("");
                    setShowNew(false);
                },
                onError: (err: unknown) =>
                    notify.error({
                        title: "Création du code NGP impossible",
                        error: err,
                        context: "lors de la création d'un code NGP",
                    }),
            }
        );
    };

    const columns: ColumnDef<SerializedNgpCode>[] = [
        {
            accessorKey: "code",
            header: "Code NGP",
            cell: (info) => {
                const row = info.row.original;
                if (editingId === row.id) {
                    return (
                        <Input
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="h-8 w-32 text-xs"
                        />
                    );
                }
                return <span className="text-sm font-mono font-medium">{row.code}</span>;
            },
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: (info) => {
                const row = info.row.original;
                if (editingId === row.id) {
                    return (
                        <Input
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="h-8 w-48 text-xs"
                        />
                    );
                }
                return (
                    <span className="text-sm text-muted-foreground">
                        {row.description ?? "—"}
                    </span>
                );
            },
        },
        {
            accessorKey: "barcode",
            header: "Code Barre",
            cell: (info) => <BarcodeDisplay value={info.row.original.barcode ?? ""} />,
        },
        {
            id: "actions",
            cell: (info) => {
                const row = info.row.original;
                if (editingId === row.id) {
                    return (
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(row.id)}>
                                <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                                <X className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    );
                }
                return (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(row)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500"
                            onClick={() => setDeletingCode(row)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Codes NGP</h2>
                    <p className="text-sm text-muted-foreground">
                        Gérez les codes NGP (Nomenclature Générale des Produits) et leurs codes-barres pour les exports
                    </p>
                </div>
                <Button size="sm" onClick={() => setShowNew(!showNew)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nouveau code NGP
                </Button>
            </div>

            {showNew && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Code NGP</Label>
                            <Input
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value)}
                                placeholder="Ex: 8471.30"
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Description du produit"
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Le code-barres EAN-13 sera généré automatiquement à partir du code NGP.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>
                            Annuler
                        </Button>
                        <Button size="sm" onClick={handleCreate} disabled={!newCode.trim()}>
                            <Plus className="h-4 w-4 mr-1" />
                            Créer
                        </Button>
                    </div>
                </div>
            )}

            <DataTable
                columns={columns}
                data={data?.codes ?? []}
                loading={isFetching}
                searchPlaceholder="Rechercher un code NGP..."
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />

            <ConfirmDialog
                open={!!deletingCode}
                onOpenChange={(open) => {
                    if (!open) setDeletingCode(null);
                }}
                onConfirm={() => {
                    if (!deletingCode) return;
                    deleteNgp.mutate(deletingCode.id, {
                        onSuccess: () =>
                            notify.success({ title: `Code NGP « ${deletingCode.code} » supprimé` }),
                        onError: (err: unknown) =>
                            notify.error({
                                title: "Suppression du code NGP impossible",
                                error: err,
                                context: "lors de la suppression d'un code NGP",
                            }),
                    });
                }}
                title="Supprimer ce code NGP ?"
                description={`Le code ${deletingCode?.code ?? ""} et son code-barres seront définitivement supprimés.`}
                isLoading={deleteNgp.isPending}
            />
        </div>
    );
}
