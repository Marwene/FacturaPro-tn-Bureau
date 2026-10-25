"use client";

import { useClientsList, useClientMutations } from "@/hooks/use-clients";
import { useClientsStore } from "@/lib/stores/clients-store";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { MoneyCell } from "@/components/shared/money-cell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { ClientDialog } from "@/components/clients/client-dialog";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTND } from "@/lib/decimal";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyDocs } from "@/components/ui/illustrations";
import {
    Users,
    Landmark,
    FileText,
    Percent,
    MoreHorizontal,
    Edit,
    Trash2,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedTiers } from "@/lib/types";
import Link from "next/link";

type ClientRow = SerializedTiers & { solde: string };

export function ClientsClient() {
    const {
        search, setSearch,
        editTiers, setEditTiers, showEditDialog, setShowEditDialog,
        deleteTarget, setDeleteTarget,
    } = useClientsStore();
    const { data, isLoading } = useClientsList();
    const { deleteClient } = useClientMutations();

    const handleSearch = (value: string) => setSearch(value);

    const handleDelete = () => {
        if (!deleteTarget) return;
        deleteClient.mutate(deleteTarget, {
            onSettled: () => setDeleteTarget(null),
        });
    };

    const columns: ColumnDef<ClientRow>[] = [
        {
            id: "client",
            accessorFn: (row) => `${row.raisonSociale} ${row.code} ${row.email ?? ""}`,
            header: "Client",
            cell: ({ row }) => {
                const r = row.original;
                return (
                    <Link href={`/clients/${r.id}`}>
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                {r.code.slice(0, 2).toUpperCase()}
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
            accessorKey: "matriculeFiscal",
            header: "Matricule Fiscal",
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
            accessorKey: "solde",
            header: () => (
                <div className="flex items-center gap-1">
                    Solde
                    <span className="text-[9px] text-muted-foreground font-normal">(toutes sociétés)</span>
                </div>
            ),
            cell: ({ getValue }) => {
                const val = parseFloat(String(getValue()));
                return (
                    <MoneyCell
                        value={val > 0 ? String(getValue()) : "0"}
                        className={
                            val > 0
                                ? "text-sm font-semibold text-orange-600 dark:text-orange-400"
                                : "text-sm text-muted-foreground"
                        }
                    />
                );
            },
        },
        {
            id: "fiscal",
            header: "TVA / Retenue",
            cell: ({ row }) => {
                const r = row.original;
                const tauxRet = parseFloat(r.tauxRetenue);
                return (
                    <div className="flex items-center gap-1">
                        {r.assujettTVA && !r.exonereTVA && (
                            <Badge variant="outline" className="text-xs">TVA</Badge>
                        )}
                        {r.exonereTVA && (
                            <Badge variant="outline" className="text-xs">Exonéré TVA</Badge>
                        )}
                        {tauxRet > 0 && (
                            <Badge variant="outline" className="text-xs">
                                RS {r.tauxRetenue}%
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
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
                            <DropdownMenuItem className="gap-2 text-sm" asChild>
                                <Link href={`/factures?clientId=${r.id}`}>
                                    <FileText className="h-4 w-4" /> Voir factures
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="gap-2 text-sm"
                                onClick={() => {
                                    setEditTiers(r);
                                    setShowEditDialog(true);
                                }}
                            >
                                <Edit className="h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="gap-2 text-sm text-red-600"
                                onClick={() => setDeleteTarget(r.id)}
                            >
                                <Trash2 className="h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const stats = data?.stats ?? {
        totalClients: 0,
        totalSolde: "0",
        clientsTVA: 0,
        avecRetenue: 0,
    };

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            <KpiGrid columns={4} className="gap-3 px-4 lg:px-6">
                <StatCard title="Total Clients" value={String(stats.totalClients)} icon={Users} subtitle="Tous les clients actifs" />
                <StatCard title="Solde Total" value={formatTND(stats.totalSolde)} icon={Landmark} subtitle="Montant total des créances" />
                <StatCard title="Clients TVA" value={String(stats.clientsTVA)} icon={FileText} subtitle="Assujettis à la TVA" />
                <StatCard title="Avec Retenue" value={String(stats.avecRetenue)} icon={Percent} subtitle="Retenue à la source" />
            </KpiGrid>

            <DataTable
                columns={columns}
                data={(data?.clients ?? []) as ClientRow[]}
                loading={isLoading}
                searchValue={search}
                onSearchChange={handleSearch}
                searchPlaceholder="Rechercher un client..."
                enableColumnVisibility
                renderEmpty={() => (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia><IllusEmptyDocs /></EmptyMedia>
                            <EmptyTitle>Aucun client</EmptyTitle>
                            <EmptyDescription>
                                Ajoutez votre premier client pour d&eacute;marrer la gestion commerciale.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            />

            {editTiers && (
                <ClientDialog
                    client={editTiers}
                    open={showEditDialog}
                    onOpenChange={(open) => {
                        setShowEditDialog(open);
                        if (!open) setEditTiers(null);
                    }}
                />
            )}

            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onOpenChange={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Supprimer le client"
                description={`Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.`}
                isLoading={deleteClient.isPending}
            />
        </div>
    );
}
