"use client";

import { useState } from "react";
import { useInvoiceList, useInvoiceMutations } from "@/hooks/use-invoices";
import { useInvoicesStore } from "@/lib/stores/invoices-store";
import { ApiError } from "@/lib/api-error";
import { StatCard } from "@/components/stat-card";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { DateCell } from "@/components/shared/date-cell";
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
import { formatTND, formatCurrency } from "@/lib/decimal";
import { notify } from "@/lib/notify";
import type { SerializedInvoice, InvoiceStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyInvoice } from "@/components/ui/illustrations";
import { MoreHorizontal, FileText, CheckCircle, Trash2, Download, DollarSign, AlertTriangle, CircleDashed } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { FacetedFilterDef } from "@/components/data-table/types";

type InvoiceRow = SerializedInvoice;

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

const columns: ColumnDef<InvoiceRow>[] = [
    {
        accessorKey: "numero",
        header: "Numéro",
        cell: (info) => <span className="font-medium text-sm">{info.renderValue() as string}</span>,
    },
    {
        accessorFn: (row) => row.tiers?.raisonSociale ?? "—",
        id: "client",
        header: "Client",
        cell: (info) => {
            const tiers = info.row.original.tiers;
            return (
                <div>
                    <p className="text-sm font-medium">{tiers?.raisonSociale ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{tiers?.ville ?? ""}</p>
                </div>
            );
        },
    },
    {
        accessorKey: "dateEmission",
        header: "Date",
        cell: (info) => <DateCell value={info.renderValue() as Date} className="text-sm" />,
    },
    {
        accessorKey: "dateEcheance",
        header: "Échéance",
        cell: (info) => <DateCell value={info.renderValue() as Date | null} className="text-sm" />,
    },
    {
        accessorKey: "totalTTC",
        header: "Total TTC",
        cell: (info) => {
            const row = info.row.original;
            return <span className="text-sm font-medium">{formatCurrency(info.renderValue() as string, row.devise)}</span>;
        },
    },
    {
        accessorKey: "montantPaye",
        header: "Payé",
        cell: (info) => {
            const row = info.row.original;
            return (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(info.renderValue() as string, row.devise)}
                </span>
            );
        },
    },
    {
        id: "paymentStatus",
        header: "Paiement",
        cell: (info) => {
            const row = info.row.original;
            const payments = row.payments ?? [];
            const effets = row.effets ?? [];
            const cheques = row.cheques ?? [];

            // Aucun paiement, effet ou chèque lié
            if (payments.length === 0 && effets.length === 0 && cheques.length === 0) {
                return (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <CircleDashed className="h-4 w-4 text-red-500" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-red-50 text-red-900 border border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800">
                            <p className="text-xs">Aucun paiement li&eacute;</p>
                        </TooltipContent>
                    </Tooltip>
                );
            }

            // Vérifier si un paiement est "en cours"
            const hasEnCoursPayments = payments.some((p) => {
                // Effet reçu mais pas encore endossé ou payé
                if (p.effet) {
                    return ["EN_PORTEFEUILLE", "REMIS_ESCOMPTE"].includes(p.effet.status);
                }
                // Chèque pas encore encaissé
                if (p.cheque) {
                    return p.cheque.status === "EN_ATTENTE";
                }
                // Virement en attente de confirmation bancaire
                if (p.methode === "VIREMENT") {
                    return p.status === "EN_ATTENTE";
                }
                return false;
            });

            // Vérifier si un effet directement lié à la facture est "en cours"
            const hasEnCoursEffets = effets.some((e) => {
                return ["EN_PORTEFEUILLE", "REMIS_ESCOMPTE"].includes(e.status);
            });

            // Vérifier si un chèque directement lié à la facture est "en cours"
            const hasEnCoursCheques = cheques.some((c) => {
                return c.status === "EN_ATTENTE";
            });

            const hasEnCours = hasEnCoursPayments || hasEnCoursEffets || hasEnCoursCheques;

            // Tous les paiements sont validés
            if (!hasEnCours) {
                return (
                    <Link href={`/factures/${row.id}`}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <CheckCircle className="h-4 w-4 text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800">
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold">Pay&eacute;</p>
                                    {payments.map((p) => {
                                        let detail = `${p.methode}`;
                                        if (p.reference) detail += ` — ${p.reference}`;
                                        if (p.effet) detail += ` (Effet ${p.effet.numero})`;
                                        if (p.cheque) detail += ` (Chèque ${p.cheque.numero})`;
                                        return (
                                            <p key={p.id} className="text-xs">
                                                {detail}
                                            </p>
                                        );
                                    })}
                                    {effets.map((e) => (
                                        <p key={e.id} className="text-xs">
                                            Effet {e.numero} (Validé)
                                        </p>
                                    ))}
                                    {cheques.map((c) => (
                                        <p key={c.id} className="text-xs">
                                            Chèque {c.numero} (Encaissé)
                                        </p>
                                    ))}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </Link>
                );
            }

            // Paiement en cours
            return (
                <Link href={`/factures/${row.id}`}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertTriangle className="h-4 w-4 text-orange-500 hover:text-orange-600 transition-colors cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-orange-50 text-orange-900 border border-orange-200 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-800">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold">Paiement en cours</p>
                                {payments.map((p) => {
                                    let statut = "";
                                    if (p.effet) {
                                        statut = p.effet.status === "EN_PORTEFEUILLE" 
                                            ? "Effet en portefeuille" 
                                            : "Effet remis à l'escompte";
                                    } else if (p.cheque) {
                                        statut = p.cheque.status === "EN_ATTENTE" 
                                            ? "Chèque en attente" 
                                            : `Chèque ${p.cheque.status}`;
                                    } else if (p.methode === "VIREMENT") {
                                        statut = "Virement en attente";
                                    } else {
                                        statut = "Validé";
                                    }
                                    let detail = `${p.methode}`;
                                    if (p.reference) detail += ` — ${p.reference}`;
                                    detail += ` (${statut})`;
                                    return (
                                        <p key={p.id} className="text-xs">
                                            {detail}
                                        </p>
                                    );
                                })}
                                {effets.map((e) => {
                                    const statut = e.status === "EN_PORTEFEUILLE" 
                                        ? "Effet en portefeuille" 
                                        : "Effet remis à l'escompte";
                                    return (
                                        <p key={e.id} className="text-xs">
                                            Effet {e.numero} ({statut})
                                        </p>
                                    );
                                })}
                                {cheques.map((c) => {
                                    const statut = c.status === "EN_ATTENTE" 
                                        ? "Chèque en attente" 
                                        : `Chèque ${c.status}`;
                                    return (
                                        <p key={c.id} className="text-xs">
                                            Chèque {c.numero} ({statut})
                                        </p>
                                    );
                                })}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </Link>
            );
        },
    },
    {
        accessorKey: "resteAPayer",
        header: "Reste",
        cell: (info) => {
            const row = info.row.original;
            const v = parseFloat(info.renderValue() as string);
            return (
                <span
                    className={
                        v > 0
                            ? "text-sm text-red-500 font-medium"
                            : "text-sm text-muted-foreground"
                    }
                >
                    {v > 0 ? formatCurrency(info.renderValue() as string, row.devise) : "—"}
                </span>
            );
        },
    },
    {
        id: "bcVise",
        header: "SN",
        cell: (info) => {
            const inv = info.row.original;
            return inv.bcViseActif ? (
                <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700 gap-1">
                    SN Visé{inv.bcViseNumero ? `: ${inv.bcViseNumero}` : ""}
                </Badge>
            ) : null;
        },
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: (info) => <InvoiceStatusBadge status={info.renderValue() as InvoiceStatus} />,
    },
];

const statusFilterDef: FacetedFilterDef = {
    columnId: "status",
    title: "Statut",
    options: [
        { label: "Brouillon", value: "BROUILLON" },
        { label: "Envoyée", value: "ENVOYEE" },
        { label: "Partielle", value: "PARTIELLE" },
        { label: "Payée", value: "PAYEE" },
        { label: "En retard", value: "EN_RETARD" },
        { label: "Annulée", value: "ANNULEE" },
    ],
};

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
