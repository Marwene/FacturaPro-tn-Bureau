"use client";

import type { SerializedDeliveryNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeliveryNoteStatusBadge, QuoteInvoicedBadge, invoicedBadgeVioletClass } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle, Trash2, Printer, Download } from "lucide-react";

interface BLDetailActionsProps {
    bl: SerializedDeliveryNote;
    onPrint: () => void;
    onPDF: () => void;
    onMarkDelivered: () => void;
    onCancel: () => void;
    onDelete: () => void;
    isUpdating: boolean;
    isDeleting: boolean;
}

export function BLDetailActions({
    bl,
    onPrint,
    onPDF,
    onMarkDelivered,
    onCancel,
    onDelete,
    isUpdating,
    isDeleting,
}: BLDetailActionsProps) {
    const router = useRouter();
    const linkedInvoice = bl.invoices?.[0]?.invoice;

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
                <h1 className="text-base font-semibold">{bl.numero}</h1>
                <DeliveryNoteStatusBadge status={bl.status} />
                {linkedInvoice && (
                    <QuoteInvoicedBadge
                        className={invoicedBadgeVioletClass}
                        numero={linkedInvoice.numero}
                        date={formatDate(linkedInvoice.dateEmission)}
                    />
                )}
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
                {bl.status === "BROUILLON" && (
                    <Button
                        size="sm"
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={onMarkDelivered}
                        disabled={isUpdating}
                    >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Marquer Livré
                    </Button>
                )}
                {bl.status !== "ANNULE" && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={onCancel}
                        disabled={isUpdating}
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        Annuler
                    </Button>
                )}
                {(bl.status === "BROUILLON" || bl.status === "ANNULE") && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-red-600"
                        onClick={onDelete}
                        disabled={isDeleting}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                    </Button>
                )}
            </div>
        </div>
    );
}
