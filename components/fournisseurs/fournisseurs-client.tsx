"use client";

import { useFournisseursList, useFournisseursMutations } from "@/hooks/use-fournisseurs";
import { useFournisseursStore } from "@/lib/stores/fournisseurs-store";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table";
import { FournisseurDialog } from "@/components/fournisseurs/fournisseur-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Users,
    UserCheck,
    UserX,
    Building2,
    MoreHorizontal,
    Edit,
    Trash2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedTiers } from "@/lib/types";
import Link from "next/link";

const columns: ColumnDef<SerializedTiers>[] = [
    {
        id: "fournisseur",
        accessorFn: (row) => `${row.raisonSociale} ${row.code} ${row.email ?? ""}`,
        header: "Fournisseur",
        cell: ({ row }) => {
            const r = row.original;
            return (
                <Link href={`/fournisseurs/${r.id}`}>
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {r.raisonSociale.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium">{r.raisonSociale}</p>
                            <p className="text-xs text-muted-foreground">{r.email ?? ""}</p>
                        </div>
                    </div>
                </Link>
            );
        },
    },
    {
        accessorKey: "code",
        header: "Code",
        cell: ({ getValue }) => (
            <span className="text-sm font-mono">{String(getValue())}</span>
        ),
    },
    {
        accessorKey: "matriculeFiscal",
        header: "Mat. Fiscal",
        cell: ({ getValue }) => (
            <span className="text-sm font-mono">{String(getValue() ?? "—")}</span>
        ),
    },
    {
        accessorKey: "ville",
        header: "Ville",
        cell: ({ getValue }) => <span className="text-sm">{String(getValue() ?? "—")}</span>,
    },
    {
        accessorKey: "telephone",
        header: "Contact",
        cell: ({ getValue }) => (
            <span className="text-sm">{String(getValue() ?? "—")}</span>
        ),
    },
    {
        id: "contactNom",
        header: "Personne",
        cell: ({ row }) => {
            const r = row.original;
            return (
                <div>
                    <p className="text-sm">{r.contactNom ?? "—"}</p>
                </div>
            );
        },
    },
    {
        id: "actif",
        header: "Statut",
        cell: ({ row }) => {
            const actif = row.original.actif;
            return (
                <Badge variant={actif ? "default" : "secondary"} className="text-xs">
                    {actif ? "Actif" : "Inactif"}
                </Badge>
            );
        },
    },
];

export function FournisseursClient() {
    const {
        searchInput, setSearchInput,
        editFournisseur, showEditDialog, setEditFournisseur, setShowEditDialog,
        deleteTarget, setDeleteTarget,
    } = useFournisseursStore();
    const { data, isLoading, isFetching } = useFournisseursList();
    const { deleteFournisseur } = useFournisseursMutations();

    const handleDelete = () => {
        if (deleteTarget) {
            deleteFournisseur.mutate(deleteTarget.id);
            setDeleteTarget(null);
        }
    };

    const stats = data?.stats ?? { total: 0, actifs: 0, inactifs: 0, avecContact: 0 };

    const actionsColumn: ColumnDef<SerializedTiers> = {
        id: "actions",
        cell: ({ row }) => {
            const r = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            className="gap-2 text-sm"
                            onClick={() => {
                                useFournisseursStore.getState().setEditFournisseur(r);
                                useFournisseursStore.getState().setShowEditDialog(true);
                            }}
                        >
                            <Edit className="h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="gap-2 text-sm text-red-600"
                            onClick={() => useFournisseursStore.getState().setDeleteTarget(r)}
                        >
                            <Trash2 className="h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-4 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <KpiGrid columns={4} className="gap-3 px-4 lg:px-6">
                <StatCard title="Total" value={String(stats.total)} icon={Users} subtitle="Tous les fournisseurs" />
                <StatCard title="Actifs" value={String(stats.actifs)} icon={UserCheck} subtitle={`${stats.inactifs} inactif${stats.inactifs > 1 ? "s" : ""}`} subtitleVariant="success" />
                <StatCard title="Inactifs" value={String(stats.inactifs)} icon={UserX} subtitle="Fournisseurs désactivés" />
                <StatCard title="Avec Contact" value={String(stats.avecContact)} icon={Building2} subtitle="Nom du contact renseigné" />
            </KpiGrid>

            <DataTable
                columns={[...columns, actionsColumn]}
                data={(data?.fournisseurs ?? []) as unknown as SerializedTiers[]}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher un fournisseur..."
                enableColumnVisibility
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                emptyMessage="Aucun fournisseur trouvé"
            />

            {editFournisseur && (
                <FournisseurDialog
                    fournisseur={editFournisseur}
                    open={showEditDialog}
                    onOpenChange={(open) => {
                        setShowEditDialog(open);
                        if (!open) setEditFournisseur(null);
                    }}
                />
            )}

            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onOpenChange={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Supprimer le fournisseur"
                description={`Êtes-vous sûr de vouloir supprimer ${deleteTarget?.raisonSociale ?? ""} ? Cette action est irréversible.`}
                isLoading={deleteFournisseur.isPending}
            />
        </div>
    );
}
