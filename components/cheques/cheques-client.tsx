"use client";

import { useChequesList, useChequesMutations } from "@/hooks/use-cheques";
import { useChequesStore } from "@/lib/stores/ui-store";
import { StatCard } from "@/components/stat-card";
import { ChequeStatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTND } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import { MoreHorizontal, CheckCircle } from "lucide-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyDocs } from "@/components/ui/illustrations";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedCheque, ChequeStatus } from "@/lib/types";

export function ChequesClient() {
    const { activeTab, setActiveTab } = useChequesStore();
    const { data, isLoading } = useChequesList();
    const { encaisserCheque } = useChequesMutations();

    const columns: ColumnDef<SerializedCheque>[] = [
        {
            accessorKey: "numero",
            header: "N° Chèque",
            cell: (info) => <span className="text-sm font-mono">{info.renderValue() as string}</span>,
        },
        {
            accessorKey: "banque",
            header: "Banque",
            cell: (info) => <span className="text-sm">{info.renderValue() as string}</span>,
        },
        {
            accessorKey: "beneficiaire",
            header: "Bénéficiaire",
            cell: (info) => <span className="text-sm">{info.renderValue() as string}</span>,
        },
        {
            accessorKey: "dateEmission",
            header: "Date Émission",
            cell: (info) => <span className="text-sm">{formatDate(info.renderValue() as Date)}</span>,
        },
        {
            accessorKey: "dateEcheance",
            header: "Date Échéance",
            cell: (info) => (
                <span className="text-sm">{info.renderValue() ? formatDate(info.renderValue() as Date) : "—"}</span>
            ),
        },
        {
            accessorKey: "montant",
            header: "Montant",
            cell: (info) => <span className="text-sm font-semibold">{formatTND(info.renderValue() as string)}</span>,
            meta: { align: "right" },
        },
        {
            accessorKey: "status",
            header: "Statut",
            cell: (info) => <ChequeStatusBadge status={info.renderValue() as ChequeStatus} />,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const cheque = row.original;
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
                                disabled={cheque.status !== "EN_ATTENTE"}
                                onClick={() => encaisserCheque.mutate(cheque.id)}
                            >
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                Encaisser
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const cheques = data?.cheques ?? [];
    const filtered = activeTab === "EN_ATTENTE"
        ? cheques.filter((c) => c.status === "EN_ATTENTE")
        : cheques.filter((c) => c.type === activeTab);

    if (isLoading) {
        return (
            <div className="flex-1 p-3 md:p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-80 rounded-lg" />
            </div>
        );
    }

    const { stats } = data ?? {};

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard title="Chèques Reçus" value={String(stats?.recusCount ?? 0)} subtitle={formatTND(stats?.recusMontant ?? "0")} />
                <StatCard title="Chèques Émis" value={String(stats?.emisCount ?? 0)} subtitle={formatTND(stats?.emisMontant ?? "0")} />
                <StatCard title="En Attente" value={String(stats?.enAttenteCount ?? 0)} subtitle={formatTND(stats?.enAttenteMontant ?? "0")} subtitleVariant={Number(stats?.enAttenteCount) > 0 ? "warning" : "default"} />
                <StatCard title="Encaissés" value={String(stats?.encaissesCount ?? 0)} subtitle={formatTND(stats?.encaissesMontant ?? "0")} subtitleVariant="success" />
            </div>

            <DataTable
                columns={columns}
                data={filtered}
                loading={isLoading}
                enableColumnVisibility
                enableMultiSort
                toolbarActions={
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                        <TabsList className="h-8">
                            <TabsTrigger value="RECU" className="text-xs h-7 px-2.5">
                                Reçus {stats?.recusCount ? `(${stats.recusCount})` : ""}
                            </TabsTrigger>
                            <TabsTrigger value="EMIS" className="text-xs h-7 px-2.5">
                                Émis {stats?.emisCount ? `(${stats.emisCount})` : ""}
                            </TabsTrigger>
                            <TabsTrigger value="EN_ATTENTE" className="text-xs h-7 px-2.5">
                                En Attente {stats?.enAttenteCount ? `(${stats.enAttenteCount})` : ""}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                }
                renderEmpty={() => (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia><IllusEmptyDocs /></EmptyMedia>
                            <EmptyTitle>Aucun chèque</EmptyTitle>
                            <EmptyDescription>
                                Aucun chèque trouvé pour cet onglet.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            />
        </div>
    );
}
