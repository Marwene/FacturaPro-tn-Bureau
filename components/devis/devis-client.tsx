"use client";

import { useDevisList, useDevisMutations } from "@/hooks/use-devis";
import { useDevisListStore } from "@/lib/stores/devis-store";
import { StatCard } from "@/components/stat-card";
import { QuoteStatusBadge, QuoteInvoicedBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTND, formatCurrency } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import { notify } from "@/lib/notify";
import type { SerializedQuote, QuoteStatus } from "@/lib/types";
import { MoreHorizontal, FileText, Trash2, CheckCircle, ReceiptText, Send } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const columns: ColumnDef<SerializedQuote>[] = [
    {
        accessorKey: "numero",
        header: "Numéro",
        cell: (info) => <span className="font-medium text-sm">{info.renderValue() as string}</span>,
    },
    {
        accessorFn: (row) =>
            (row.tiers as { raisonSociale: string; ville?: string | null } | undefined)?.raisonSociale ?? "—",
        id: "client",
        header: "Client",
        cell: (info) => {
            const client = (info.row.original as SerializedQuote).tiers as
                | { raisonSociale: string; ville?: string | null }
                | undefined;
            return (
                <div>
                    <p className="text-sm font-medium">{client?.raisonSociale ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{client?.ville ?? ""}</p>
                </div>
            );
        },
    },
    {
        accessorKey: "dateCreation",
        header: "Date",
        cell: (info) => <span className="text-sm">{formatDate(info.renderValue() as Date)}</span>,
    },
    {
        accessorKey: "dateExpiration",
        header: "Expiration",
        cell: (info) => (
            <span className="text-sm">
                {info.renderValue() ? formatDate(info.renderValue() as Date) : "—"}
            </span>
        ),
    },
    {
        accessorKey: "totalTTC",
        header: "Montant TTC",
        cell: (info) => {
            const quote = info.row.original;
            const devise = quote.devise ?? "TND";
            return <span className="text-sm font-medium">{formatCurrency(info.renderValue() as string, devise)}</span>;
        },
    },
    {
        id: "equivalentTND",
        header: "Equivalent TND",
        cell: (info) => {
            const quote = info.row.original;
            if (quote.devise === "TND" || !quote.montantTND) {
                return <span className="text-sm text-muted-foreground">—</span>;
            }
            return <span className="text-sm font-medium">{formatTND(quote.montantTND)}</span>;
        },
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: (info) => <QuoteStatusBadge status={info.renderValue() as QuoteStatus} />,
    },
    {
        id: "facture",
        header: "Facture",
        cell: (info) => {
            const row = info.row.original;
            return row.invoiceId ? <QuoteInvoicedBadge /> : (
                <span className="text-muted-foreground text-sm">—</span>
            );
        },
    },
];

export function DevisClient() {
    const searchInput = useDevisListStore((s) => s.searchInput);
    const setSearchInput = useDevisListStore((s) => s.setSearchInput);
    const statusFilter = useDevisListStore((s) => s.statusFilter);
    const setStatusFilter = useDevisListStore((s) => s.setStatusFilter);
    const { data, isFetching, isLoading } = useDevisList();
    const { updateStatus, deleteQuote } = useDevisMutations();

    const actionsColumn: ColumnDef<SerializedQuote> = {
        id: "actions",
        cell: (info) => {
            const quote = info.row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                            <Link href={`/devis/${quote.id}`} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Voir détail
                            </Link>
                        </DropdownMenuItem>
                        {quote.status === "BROUILLON" && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: quote.id, status: "ENVOYEE" },
                                        {
                                            onSuccess: () =>
                                                notify.success({ title: `Devis ${quote.numero} envoyé` }),
                                            onError: (err) => notify.error({ title: "Envoi impossible", error: err, context: "marquage du devis comme envoyé" }),
                                        }
                                    )
                                }
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marquer Envoyé
                            </DropdownMenuItem>
                        )}
                        {quote.status !== "FACTUREE" && (
                            <DropdownMenuItem asChild>
                                <Link href={`/devis/${quote.id}`} className="flex items-center gap-2">
                                    <ReceiptText className="h-4 w-4 mr-2" />
                                    Convertir en facture
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                                deleteQuote.mutate(quote.id, {
                                    onSuccess: () =>
                                        notify.success({ title: `Devis ${quote.numero} supprimé` }),
                                    onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression du devis" }),
                                })
                            }
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
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
                <Skeleton className="h-80 rounded-lg" />
            </div>
        );
    }

    const { stats } = data ?? {};

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Devis" value={String(stats?.total ?? 0)} icon={FileText} subtitle="Tous les devis en cours" />
                <StatCard title="Montant Total" value={formatTND(stats?.montantTotal ?? "0")} icon={ReceiptText} subtitle="Valeur totale des devis" />
                <StatCard title="Taux d'Acceptation" value={`${stats?.tauxAcceptation ?? 0}%`} icon={CheckCircle} subtitle="Devis acceptés" />
                <StatCard title="En Attente" value={String(stats?.enAttente ?? 0)} icon={Send} subtitle="En attente de réponse" />
            </div>

            <DataTable
                columns={[...columns, actionsColumn]}
                data={(data?.quotes ?? []) as SerializedQuote[]}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher (N°, client...)"
                enableColumnVisibility
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                toolbarActions={
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as QuoteStatus | "ALL")}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous</SelectItem>
                            <SelectItem value="BROUILLON">Brouillon</SelectItem>
                            <SelectItem value="ENVOYEE">Envoyé</SelectItem>
                            <SelectItem value="ACCEPTEE">Accepté</SelectItem>
                            <SelectItem value="REFUSEE">Refusé</SelectItem>
                            <SelectItem value="EXPIREE">Expiré</SelectItem>
                            <SelectItem value="FACTUREE">Facturé</SelectItem>
                        </SelectContent>
                    </Select>
                }
            />
        </div>
    );
}
