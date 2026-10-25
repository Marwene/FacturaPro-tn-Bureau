"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { FacetedFilterDef } from "@/components/data-table/types"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CheckCircle, Eye, MoreHorizontal, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/decimal"
import { formatDate } from "@/lib/utils"
import { notify } from "@/lib/notify"
import type { SerializedPayment } from "@/lib/types"
import { useDeletePayment, useUpdatePayment } from "@/hooks/use-queries"
import { modeReglementIcon, modeReglementLabel } from "@/components/shared/mode-reglement-badge"
import { StatutFluxBadge } from "@/components/paiements/statut-flux-badge"

/**
 * Colonnes de la table Paiements — extraites de `paiements-client` (lot D3.2,
 * limite 250 lignes). Libellés/icônes de mode : `components/shared/mode-reglement-badge`
 * (source unique, plus de copies `METHOD_LABELS` / `METHOD_ICONS`).
 */

export const paiementsColumns: ColumnDef<SerializedPayment>[] = [
    {
        accessorKey: "dateReglement",
        header: "Date",
        cell: ({ row }) => <span className="text-sm">{formatDate(row.original.dateReglement)}</span>,
    },
    {
        accessorKey: "reference",
        header: "Référence",
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.reference ?? "—"}</span>,
    },
    {
        accessorFn: (row) => row.invoice?.numero ?? "—",
        id: "facture",
        header: "Facture",
        cell: ({ row }) => {
            const { invoice, invoiceId } = row.original
            return invoiceId ? (
                <Link href={`/factures/${invoiceId}`} className="text-sm font-medium text-foreground hover:underline">
                    {invoice?.numero ?? "—"}
                </Link>
            ) : (
                <span className="text-sm text-muted-foreground">{invoice?.numero ?? "—"}</span>
            )
        },
    },
    {
        accessorFn: (row) => row.tiers?.raisonSociale ?? "—",
        id: "client",
        header: "Client",
        cell: ({ row }) => (
            <div>
                <p className="text-sm font-medium">{row.original.tiers?.raisonSociale ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{row.original.tiers?.ville ?? ""}</p>
            </div>
        ),
    },
    {
        accessorKey: "methode",
        header: "Méthode",
        cell: ({ row }) => {
            const method = row.original.methode
            const Icon = modeReglementIcon(method)
            return (
                <div className="flex items-center gap-1.5">
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                    <span className="text-sm">{modeReglementLabel(method)}</span>
                </div>
            )
        },
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => <StatutFluxBadge status={row.original.status} />,
    },
    {
        accessorKey: "montant",
        header: "Montant",
        cell: ({ row }) => (
            <span className="text-sm font-medium tabular-nums">
                {formatCurrency(row.original.montant, row.original.invoice?.devise ?? "TND")}
            </span>
        ),
    },
    {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => (
            <span className="block max-w-[200px] truncate text-sm text-muted-foreground">
                {row.original.notes ?? "—"}
            </span>
        ),
    },
    {
        id: "totalTTC",
        header: "Total Facture",
        cell: ({ row }) => {
            const inv = row.original.invoice
            return inv ? (
                <span className="text-sm text-muted-foreground tabular-nums">{formatCurrency(inv.totalTTC, inv.devise)}</span>
            ) : (
                <span className="text-sm text-muted-foreground">—</span>
            )
        },
    },
]

export const methodFilterDef: FacetedFilterDef = {
    columnId: "methode",
    title: "Méthode",
    options: ["ESPECES", "VIREMENT", "CARTE", "CHEQUE"].map((value) => ({
        label: modeReglementLabel(value),
        value,
    })),
}

/** Colonnes + actions (confirm / voir facture / supprimer) — les seules mutations de l'écran. */
export function usePaiementsColumns(): ColumnDef<SerializedPayment>[] {
    const deletePayment = useDeletePayment()
    const updatePayment = useUpdatePayment()

    const actionsColumn: ColumnDef<SerializedPayment> = {
        id: "actions",
        cell: ({ row }) => {
            const p = row.original
            const isVirementPending = p.methode === "VIREMENT" && p.status === "EN_ATTENTE"
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Actions du paiement">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {p.invoiceId && (
                            <DropdownMenuItem asChild>
                                <Link href={`/factures/${p.invoiceId}`} className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Voir facture
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {isVirementPending && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updatePayment.mutate(
                                        { id: p.id, status: "CONFIRME" },
                                        {
                                            onSuccess: () => notify.success({ title: p.reference ? `Virement ${p.reference} confirmé` : "Virement confirmé" }),
                                            onError: (err) => notify.error({ title: "Confirmation impossible", error: err, context: "confirmation du virement" }),
                                        },
                                    )
                                }
                            >
                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                Confirmer
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                                deletePayment.mutate(p.id, {
                                    onSuccess: () => notify.success({ title: p.reference ? `Paiement ${p.reference} supprimé` : "Paiement supprimé" }),
                                    onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression du paiement" }),
                                })
                            }
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    }

    return [...paiementsColumns, actionsColumn]
}
