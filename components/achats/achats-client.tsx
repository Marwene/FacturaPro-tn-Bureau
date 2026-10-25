"use client";


import { useUpdateAchatStatus, useDeleteAchat } from "@/hooks/use-queries";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { DateCell } from "@/components/shared/date-cell";
import { MoneyCell } from "@/components/shared/money-cell";
import { AchatStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/decimal";
import { notify } from "@/lib/notify";
import type { SerializedAchat, AchatStatus, AchatType } from "@/lib/types";
import { MoreHorizontal, FileText, CheckCircle, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { FacetedFilterDef } from "@/components/data-table/types";
import { useAchatsStore } from "@/lib/stores/achats-store";
import { useAchatsList } from "@/hooks/use-achats-queries";

type AchatRow = SerializedAchat;

const columns: ColumnDef<AchatRow>[] = [
    {
        accessorKey: "numero",
        header: "Numéro",
        cell: (info) => <span className="font-medium text-sm">{info.renderValue() as string}</span>,
    },
    {
        accessorFn: (row) => (row.tiers as { raisonSociale: string; ville?: string | null } | undefined)?.raisonSociale ?? "—",
        id: "fournisseur",
        header: "Fournisseur",
        cell: (info) => {
            const tiersEntity = (info.row.original as AchatRow).tiers as
                | { raisonSociale: string; ville?: string | null }
                | undefined;
            return (
                <div>
                    <p className="text-sm font-medium">{tiersEntity?.raisonSociale ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{tiersEntity?.ville ?? ""}</p>
                </div>
            );
        },
    },
    {
        accessorKey: "dateFacture",
        header: "Date Facture",
        cell: (info) => <DateCell value={info.renderValue() as Date} className="text-sm" />,
    },
    {
        accessorKey: "referenceFournisseur",
        header: "Réf. Fournisseur",
        cell: (info) => (
            <span className="text-sm text-muted-foreground">
                {info.renderValue() ? (info.renderValue() as string) : "—"}
            </span>
        ),
    },
    {
        accessorKey: "totalTTC",
        header: "Total TTC",
        cell: (info) => {
            return <MoneyCell value={info.renderValue() as string} className="text-sm font-medium" />;
        },
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: (info) => <AchatStatusBadge status={info.renderValue() as AchatStatus} />,
    },
];

const statusFilterDef: FacetedFilterDef = {
    columnId: "status",
    title: "Statut",
    options: [
        { label: "Brouillon", value: "BROUILLON" },
        { label: "Validée", value: "VALIDEE" },
        { label: "Annulée", value: "ANNULEE" },
    ],
};

export function AchatsClient({ type }: { type?: AchatType }) {
    const { searchInput, setSearchInput } = useAchatsStore();
    const { data, isFetching, isLoading } = useAchatsList(type);
    const updateStatus = useUpdateAchatStatus();
    const deleteAchat = useDeleteAchat();

    const stats = data?.stats;
    const parCategorie = data?.parCategorie ?? [];
    const categorieTotals = new Map(
        parCategorie
            .filter((c) => c.categorie)
            .map((c) => [c.categorie as string, c.totalTTC])
    );

    const actionsColumn: ColumnDef<AchatRow> = {
        id: "actions",
        cell: (info) => {
            const achat = info.row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                            <Link href={`/achats/${achat.id}`} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Voir détail
                            </Link>
                        </DropdownMenuItem>
                        {achat.status === "BROUILLON" && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: achat.id, status: "VALIDEE" },
                                        {
                                            onSuccess: () =>
                                                notify.success({ title: `Achat ${achat.numero} validé`, description: "Le stock a été mis à jour." }),
                                            onError: (err) => notify.error({ title: "Validation impossible", error: err, context: "validation de l'achat" }),
                                        }
                                    )
                                }
                            >
                                <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                                Valider
                            </DropdownMenuItem>
                        )}
                        {achat.status === "BROUILLON" && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() =>
                                        deleteAchat.mutate(achat.id, {
                                            onSuccess: () =>
                                                notify.success({ title: `Achat ${achat.numero} supprimé` }),
                                            onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression de l'achat" }),
                                        })
                                    }
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                </DropdownMenuItem>
                            </>
                        )}
                        {achat.status === "VALIDEE" && (
                            <DropdownMenuItem
                                className="text-orange-600"
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: achat.id, status: "ANNULEE" },
                                        {
                                            onSuccess: () =>
                                                notify.success({
                                                    title: `Achat ${achat.numero} annulé`,
                                                    description: "Le stock a été réajusté si l'achat était déjà validé.",
                                                }),
                                            onError: (err) => notify.error({ title: "Annulation impossible", error: err, context: "annulation de l'achat" }),
                                        }
                                    )
                                }
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Annuler
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Stats */}
            <KpiGrid columns={3} className="gap-3 px-4 lg:px-6">
                <StatCard title="Total Achats" value={formatCurrency(stats?.totalTTC ?? "0", "TND")} icon={FileText} subtitle={`${stats?.total ?? 0} achats`} />
                <StatCard title="Validées" value={String(stats?.validees ?? 0)} icon={CheckCircle} subtitle="Achats validés" subtitleVariant="success" />
                <StatCard title="Brouillons" value={String(stats?.brouillons ?? 0)} icon={FileText} subtitle="En attente de validation" subtitleVariant="warning" />
            </KpiGrid>

            {/* Costs by category */}
            <KpiGrid columns={3} className="gap-3 px-4 lg:px-6">
                <StatCard title="Matières premières" value={formatCurrency(categorieTotals.get("MATIERES_PREMIERES"), "TND")} icon={FileText} subtitle="Coût des achats" />
                <StatCard title="Tenues de travail" value={formatCurrency(categorieTotals.get("TENUES_TRAVAIL"), "TND")} icon={FileText} subtitle="Coût des achats" />
                <StatCard title="Divers" value={formatCurrency(categorieTotals.get("DIVERS"), "TND")} icon={FileText} subtitle="Coût des achats" />
            </KpiGrid>

            {/* Table */}
            <DataTable
                columns={[...columns, actionsColumn]}
                data={(data?.achats ?? []) as unknown as AchatRow[]}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher (N°, fournisseur...)"
                facetedFilters={[statusFilterDef]}
                enableColumnVisibility
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />
        </div>
    );
}
