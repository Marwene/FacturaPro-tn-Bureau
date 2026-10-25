"use client";

import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { useBonsCommandeStore } from "@/lib/stores/bons-commande-store";
import { useBCList, useBCMutations } from "@/hooks/use-bc";
import type { SerializedBonCommande, BonCommandeStatus } from "@/lib/types";
import { FileText, MoreHorizontal, Eye, Trash2, CheckCircle, FileEdit } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/decimal";
import { StatusBadge } from "@/components/status-badge";
import { useState } from "react";
import { notify } from "@/lib/notify";

function BCRowActions({ bc }: { bc: SerializedBonCommande }) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const { deleteBC } = useBCMutations();

    const handleDelete = () => {
        deleteBC.mutate(bc.id, {
            onSuccess: () => {
                notify.success({ title: `Bon de commande ${bc.numero} supprimé` });
                setConfirmOpen(false);
            },
            onError: (err: unknown) =>
                notify.error({
                    title: "Suppression du bon de commande impossible",
                    error: err,
                    context: "lors de la suppression du bon de commande depuis la liste",
                }),
        });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/bons-commande/${bc.id}`}>
                            <Eye className="h-4 w-4 mr-2" /> Voir le détail
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(e) => {
                            e.preventDefault();
                            setConfirmOpen(true);
                        }}
                    >
                        <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmDeleteDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                onConfirm={handleDelete}
                title={`Supprimer le bon de commande ${bc.numero} ?`}
                description="Cette action est irréversible et supprimera également ses lignes et le détail de rapprochement associé."
                isLoading={deleteBC.isPending}
            />
        </>
    );
}

const columns: ColumnDef<SerializedBonCommande>[] = [
    {
        accessorKey: "numero",
        header: "N° BC",
        cell: ({ row }) => (
            <Link href={`/bons-commande/${row.original.id}`} className="font-medium hover:underline">
                {row.original.numero}
            </Link>
        ),
    },
    {
        id: "client",
        accessorKey: "client",
        header: "Réf. Client",
        cell: ({ row }) => row.original.referenceClient ?? "-",
    },
    {
        id: "clientTiers",
        header: "Client",
        cell: ({ row }) => row.original.tiers?.raisonSociale ?? "-",
    },
    {
        id: "date",
        header: "Date",
        cell: ({ row }) => new Date(row.original.dateCreation).toLocaleDateString("fr-TN"),
    },
    {
        accessorKey: "totalTTC",
        header: "Total TTC",
        cell: ({ row }) => formatCurrency(Number(row.original.totalTTC)),
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => (
            <StatusBadge type="bon-commande" status={row.original.status} />
        ),
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => <BCRowActions bc={row.original} />,
    },
];

export function BonsCommandeClient() {
    const { searchInput, setSearchInput, statusFilter, setStatusFilter } = useBonsCommandeStore();
    const { data, isFetching } = useBCList();

    const stats = data?.stats ?? { total: 0, countDraft: 0, countAccepted: 0 };

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard title="Total" value={String(stats.total)} icon={FileText} subtitle="Tous les bons de commande" />
                <StatCard title="Acceptés" value={String(stats.countAccepted)} icon={CheckCircle} subtitle="Bons validés" subtitleVariant="success" />
                <StatCard title="Brouillons" value={String(stats.countDraft)} icon={FileEdit} subtitle="En cours de rédaction" subtitleVariant="warning" />
            </div>

            <DataTable
                columns={columns}
                data={data?.data ?? []}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher par N° ou client..."
                enableColumnVisibility
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                toolbarActions={
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BonCommandeStatus | "ALL")}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous</SelectItem>
                            <SelectItem value="BROUILLON">Brouillon</SelectItem>
                            <SelectItem value="ACCEPTE">Accepté</SelectItem>
                            <SelectItem value="ANNULE">Annulé</SelectItem>
                        </SelectContent>
                    </Select>
                }
                emptyMessage="Aucun bon de commande"
            />
        </div>
    );
}
