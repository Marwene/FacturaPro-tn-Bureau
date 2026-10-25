"use client";

import type { SerializedInvoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, CheckCircle, CreditCard, Printer, Download } from "lucide-react";

interface FactureDetailActionsProps {
    invoice: SerializedInvoice;
    onPrint: () => void;
    onPDF: () => void;
    onSend: () => void;
    onMarkPaid: () => void;
    onRecordPayment: () => void;
    isPending: boolean;
}

export function FactureDetailActions({
    invoice,
    onPrint,
    onPDF,
    onSend,
    onMarkPaid,
    onRecordPayment,
    isPending,
}: FactureDetailActionsProps) {
    const router = useRouter();

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <PageHeader title={invoice.numero} className="min-w-0" />
                <InvoiceStatusBadge status={invoice.status} />

            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onPrint}>
                    <Printer className="h-3.5 w-3.5" />
                    Imprimer
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onPDF}>
                    <Download className="h-3.5 w-3.5" />
                    PDF
                </Button>
                {invoice.status === "BROUILLON" && (
                    <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={onSend}
                        disabled={isPending}
                    >
                        <Send className="h-3.5 w-3.5" />
                        Envoyer
                    </Button>
                )}
                {(invoice.status === "ENVOYEE" || invoice.status === "PARTIELLE" || invoice.status === "EN_RETARD") && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={onRecordPayment}
                        >
                            <CreditCard className="h-3.5 w-3.5" />
                            Enregistrer Paiement
                        </Button>
                        <Button
                            size="sm"
                            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={onMarkPaid}
                            disabled={isPending}
                        >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Marquer Payée
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
