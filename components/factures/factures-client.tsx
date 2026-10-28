"use client";

import { useState } from "react";
import { useInvoiceList, useInvoiceMutations } from "@/hooks/use-invoices";
import { useInvoicesStore } from "@/lib/stores/invoices-store";
import { ApiError } from "@/lib/api-error";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatTND } from "@/lib/decimal";
import { notify } from "@/lib/notify";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyInvoice } from "@/components/ui/illustrations";
import { MoreHorizontal, FileText, CheckCircle, Trash2, Download, DollarSign, AlertTriangle, CircleDashed } from "lucide-react";
import Link from "next/link";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { columns, type InvoiceRow } from "./factures-columns";
import { statusFilterDef } from "./factures-filters";

type BlockedDeleteBody = {
    invoiceNumero: string;
    blNumeros: string[];
};

function isBlockedDeleteBody(body: unknown): body is BlockedDeleteBody {
    if (typeof body !== "object" || body === null) return false;
    if (!("invoiceNumero" in body) || !("blNumeros" in body)) return false;
    const { invoiceNumero, blNumeros } = body;
    if (typeof invoiceNumero !== "string") return false;
    if (!Array.isArray(blNumeros)) return false;
    return blNumeros.every((item: unknown) => typeof item === "string");
}

export function FacturesClient() {
    const searchInput = useInvoicesStore((s) => s.searchInput);
    const setSearchInput = useInvoicesStore((s) => s.setSearchInput);
    const { data, isFetching, isLoading } = useInvoiceList();
    const { updateStatus, deleteInvoice } = useInvoiceMutations();
    const [deleteBlocked, setDeleteBlocked] = useState<BlockedDeleteBody | null>(null);

    const stats = data?.stats;

    const actionsColumn: ColumnDef<InvoiceRow> = {
        id: "actions",
        cell: (info) => {
            const inv = info.row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                            <Link href={`/factures/${inv.id}`} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Voir détail
                            </Link>
                        </DropdownMenuItem>
                        {inv.status === "BROUILLON" && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: inv.id, status: "ENVOYEE" },
                                        {
                                            onSuccess: () =>
                                                notify.success({ title: `Facture ${inv.numero} marquée comme envoyée` }),
                                            onError: (err) => notify.error({ title: "Envoi impossible", error: err, context: "marquage de la facture comme envoyée" }),
                                        }
                                    )
                                }
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marquer Envoyée
                            </DropdownMenuItem>
                        )}
                        {(inv.status === "ENVOYEE" || inv.status === "PARTIELLE") && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: inv.id, status: "PAYEE" },
                                        {
                                            onSuccess: () =>
                                                notify.success({ title: `Facture ${inv.numero} marquée comme payée` }),
                                            onError: (err) => notify.error({ title: "Mise à jour impossible", error: err, context: "marquage de la facture comme payée" }),
                                        }
                                    )
                                }
                            >
                                <DollarSign className="h-4 w-4 mr-2 text-emerald-600" />
                                Marquer Payée
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                                deleteInvoice.mutate(inv.id, {
                                    onSuccess: () =>
                                        notify.success({ title: `Facture ${inv.numero} supprimée` }),
                                    onError: (err) => {
                                        if (
                                            err instanceof ApiError &&
                                            isBlockedDeleteBody(err.body)
                                        ) {
                                            setDeleteBlocked(err.body);
                                        } else {
                                            notify.error({ title: "Suppression impossible", error: err, context: "suppression de la facture" });
                                        }
                                    },
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

    const blockedDescription =
        deleteBlocked === null
            ? null
            : deleteBlocked.blNumeros.length === 1
              ? `Il est impossible de supprimer la facture ${deleteBlocked.invoiceNumero} car elle est liée au Bon de livraison ${deleteBlocked.blNumeros[0]} qui est déjà livré et facturé.`
              : `Il est impossible de supprimer la facture ${deleteBlocked.invoiceNumero} car elle est liée aux Bons de livraison ${deleteBlocked.blNumeros.join(", ")} qui sont déjà livrés et facturés.`;

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
        <TooltipProvider>
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Stats */}
            <KpiGrid columns={4} className="gap-3 px-4 lg:px-6">
                <StatCard title="Total Facturé" value={formatTND(stats?.totalFacture ?? "0")} icon={FileText} subtitle={`${stats?.totalFactures ?? 0} factures`} />
                <StatCard title="Encaissé" value={formatTND(stats?.encaisse ?? "0")} icon={CheckCircle} subtitle={`${stats?.paidCount ?? 0} payées`} subtitleVariant="success" />
                <StatCard title="En Attente" value={formatTND(stats?.enAttente ?? "0")} icon={CircleDashed} subtitle={`${stats?.pendingCount ?? 0} factures`} />
                <StatCard title="En Retard" value={formatTND(stats?.enRetard ?? "0")} icon={AlertTriangle} subtitle={`${stats?.overdueCount ?? 0} factures`} subtitleVariant={Number(stats?.overdueCount) > 0 ? "danger" : "default"} />
            </KpiGrid>

            {/* Table */}
            <DataTable
                columns={[...columns, actionsColumn]}
                data={(data?.invoices ?? []) as unknown as InvoiceRow[]}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher (N°, client...)"
                facetedFilters={[statusFilterDef]}
                enableColumnVisibility
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                toolbarActions={
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs ml-auto">
                        <Download className="h-3.5 w-3.5" />
                        Export TEJ
                    </Button>
                }
                renderEmpty={() => (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia><IllusEmptyInvoice /></EmptyMedia>
                            <EmptyTitle>Aucune facture</EmptyTitle>
                            <EmptyDescription>
                                Créez votre première facture pour commencer &agrave; suivre vos encaissements.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            />
        </div>

        <AlertDialog
            open={deleteBlocked !== null}
            onOpenChange={(open) => {
                if (!open) setDeleteBlocked(null);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia className="bg-amber-100 dark:bg-amber-900/30">
                        <AlertTriangle className="size-5 text-amber-700 dark:text-amber-400" />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Suppression impossible</AlertDialogTitle>
                    <AlertDialogDescription>{blockedDescription}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction>J&apos;ai compris</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </TooltipProvider>
    );
}
