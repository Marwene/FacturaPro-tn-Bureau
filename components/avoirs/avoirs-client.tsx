"use client";

import { useAvoirsList, useAvoirMutations } from "@/hooks/use-avoirs";
import { useAvoirsStore } from "@/lib/stores/avoirs-store";
import { StatCard } from "@/components/stat-card";
import { AvoirStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatTND } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import { notify } from "@/lib/notify";
import type { SerializedAvoir, AvoirStatus, AvoirType } from "@/lib/types";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyInvoice } from "@/components/ui/illustrations";
import { MoreHorizontal, FileText, Send, CheckCircle2, Trash2 } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { FacetedFilterDef } from "@/components/data-table/types";

type AvoirRow = SerializedAvoir & {
    tiers?: { raisonSociale: string; ville: string | null } | null;
};

function AvoirTypeBadge({ type }: { type: AvoirType }) {
    return (
        <Badge variant="outline" className="text-xs border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400">
            {type === "SIMPLE" ? "Simple" : "Financier"}
        </Badge>
    );
}

const columns: ColumnDef<AvoirRow>[] = [
    {
        accessorKey: "numero",
        header: "Numéro",
        cell: (info) => <span className="font-medium text-sm">{info.renderValue() as string}</span>,
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: (info) => <AvoirTypeBadge type={info.renderValue() as AvoirType} />,
    },
    {
        accessorFn: (row) =>
            (row.tiers as { raisonSociale: string } | undefined)?.raisonSociale ?? "—",
        id: "entite",
        header: "Client / Fournisseur",
        cell: (info) => {
            const row = info.row.original;
            const tiersEntity = row.tiers as { raisonSociale: string; ville?: string | null } | null | undefined;
            const name = tiersEntity?.raisonSociale ?? "—";
            const sub = tiersEntity?.ville;
            return (
                <div>
                    <p className="text-sm">{name}</p>
                    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </div>
            );
        },
    },
    {
        accessorKey: "dateEmission",
        header: "Date",
        cell: (info) => <span className="text-sm">{formatDate(info.renderValue() as Date)}</span>,
    },
    {
        accessorKey: "totalTTC",
        header: "Total TTC",
        cell: (info) => <span className="text-sm font-medium">{formatTND(info.renderValue() as string)}</span>,
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: (info) => <AvoirStatusBadge status={info.renderValue() as AvoirStatus} />,
    },
];

const statusFilterDef: FacetedFilterDef = {
    columnId: "status",
    title: "Statut",
    options: [
        { label: "Brouillon", value: "BROUILLON" },
        { label: "Émis", value: "EMIS" },
        { label: "Remboursé", value: "REMBOURSE" },
        { label: "Annulé", value: "ANNULE" },
    ],
};

export function AvoirsClient() {
    const searchInput = useAvoirsStore((s) => s.searchInput);
    const setSearchInput = useAvoirsStore((s) => s.setSearchInput);
    const { data, isFetching, isLoading } = useAvoirsList();
    const { updateStatus, deleteAvoir } = useAvoirMutations();

    const stats = data?.stats;

    const actionsColumn: ColumnDef<AvoirRow> = {
        id: "actions",
        cell: (info) => {
            const avoir = info.row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                            <Link href={`/avoirs/${avoir.id}`} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Voir détail
                            </Link>
                        </DropdownMenuItem>
                        {avoir.status === "BROUILLON" && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: avoir.id, status: "EMIS" as AvoirStatus },
                                        {
                                            onSuccess: () => notify.success({ title: `Avoir ${avoir.numero} marqué comme émis` }),
                                            onError: (err) => notify.error({ title: "Avoir non émis", error: err, context: "émission de l'avoir" }),
                                        }
                                    )
                                }
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Marquer Émis
                            </DropdownMenuItem>
                        )}
                        {avoir.status === "EMIS" && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: avoir.id, status: "REMBOURSE" as AvoirStatus },
                                        {
                                            onSuccess: () => notify.success({ title: `Avoir ${avoir.numero} marqué comme remboursé` }),
                                            onError: (err) => notify.error({ title: "Remboursement non enregistré", error: err, context: "remboursement de l'avoir" }),
                                        }
                                    )
                                }
                            >
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                Marquer Remboursé
                            </DropdownMenuItem>
                        )}
                        {(avoir.status === "BROUILLON" || avoir.status === "EMIS") && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                        deleteAvoir.mutate(avoir.id, {
                                            onSuccess: () => notify.success({ title: `Avoir ${avoir.numero} supprimé` }),
                                            onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression de l'avoir" }),
                                        })
                                    }
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                </DropdownMenuItem>
                            </>
                        )}
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
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Avoirs" value={formatTND(stats?.total ?? "0")} icon={FileText} subtitle={`${stats?.count ?? 0} avoirs`} />
                <StatCard title="Émis" value={String(stats?.emis ?? 0)} icon={Send} subtitle="En circulation" />
                <StatCard title="Remboursé" value={String(stats?.rembourse ?? 0)} icon={CheckCircle2} subtitle="Traités" subtitleVariant="success" />
                <StatCard title="Brouillon" value={String(stats?.brouillon ?? 0)} icon={FileText} subtitle="En attente" subtitleVariant="warning" />
            </div>

            {/* Table */}
            <DataTable
                columns={[...columns, actionsColumn]}
                data={(data?.avoirs ?? []) as unknown as AvoirRow[]}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher (N°, client, fournisseur...)"
                facetedFilters={[statusFilterDef]}
                enableColumnVisibility
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                renderEmpty={() => (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia><IllusEmptyInvoice /></EmptyMedia>
                            <EmptyTitle>Aucun avoir</EmptyTitle>
                            <EmptyDescription>
                                Créez votre premier avoir pour commencer à suivre vos notes de crédit.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            />
        </div>
    );
}
