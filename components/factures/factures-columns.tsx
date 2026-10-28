import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedInvoice, InvoiceStatus } from "@/lib/types";
import { DateCell } from "@/components/shared/date-cell";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/decimal";
import Link from "next/link";
import { CheckCircle, AlertTriangle, CircleDashed } from "lucide-react";
export type InvoiceRow = SerializedInvoice;
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
export { columns };
