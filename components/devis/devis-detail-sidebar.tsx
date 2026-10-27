"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatTND, formatCurrency } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ReceiptText, Trash2, CalendarDays, Clock, StickyNote } from "lucide-react";
import type Big from "big.js";
import type { SerializedQuote } from "@/lib/types";

type DevisDetailSidebarProps = {
    quote: SerializedQuote;
    devise: string;
    tauxChange: number | null;
    totalTTCWithTimbre: Big;
    canConvert: boolean;
    canDelete: boolean;
    convertToInvoice: { isPending: boolean };
    handleConvertToInvoice: () => void;
    handleDelete: () => void;
};

/** RIGHT COLUMN — Sidebar : Total TTC, Metadata, Secondary Actions (ex-devis-detail-client L391-486). */
export function DevisDetailSidebar({ quote, devise, tauxChange, totalTTCWithTimbre, canConvert, canDelete, convertToInvoice, handleConvertToInvoice, handleDelete }: DevisDetailSidebarProps) {
    return (
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
            {/* Total TTC — Visual Anchor */}
            <div className="rounded-xl bg-foreground text-background p-6 shadow-lg dark:shadow-none dark:border dark:border-white/10">
                <p className="text-[11px] font-medium text-background/50 uppercase tracking-widest">Total TTC</p>
                <p className="text-3xl font-bold tracking-tight tabular-nums mt-1.5">
                    {formatCurrency(totalTTCWithTimbre, devise)}
                </p>
                {devise !== "TND" && tauxChange && (
                    <p className="text-xs text-background/40 mt-2 tabular-nums">
                        ≈ {formatTND(totalTTCWithTimbre.times(tauxChange))}
                    </p>
                )}
            </div>

            {/* Metadata Card — Dates, Notes, Links */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Informations
                </div>
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3" />
                            Créé le
                        </span>
                        <span className="font-medium tabular-nums">{formatDate(quote.dateCreation)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            Expire le
                        </span>
                        <span className="font-medium tabular-nums">
                            {quote.dateExpiration ? formatDate(quote.dateExpiration) : "—"}
                        </span>
                    </div>
                </div>
                {quote.notes && (
                    <>
                        <Separator />
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                                <StickyNote className="h-3 w-3" />
                                Notes
                            </span>
                            <p className="text-xs text-muted-foreground leading-relaxed">{quote.notes}</p>
                        </div>
                    </>
                )}
                {quote.invoiceId && (
                    <>
                        <Separator />
                        <Link
                            href={`/factures/${quote.invoiceId}`}
                            className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors duration-150"
                        >
                            Voir la facture liée
                            <span className="text-[10px]">→</span>
                        </Link>
                    </>
                )}
            </div>

            {/* Secondary Actions */}
            <div className="space-y-2">
                {canConvert && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center gap-2 active:scale-[0.96] transition-transform duration-150"
                        onClick={handleConvertToInvoice}
                        disabled={convertToInvoice.isPending}
                    >
                        <ReceiptText className="h-3.5 w-3.5" />
                        {convertToInvoice.isPending ? "Conversion..." : "Convertir en Facture"}
                    </Button>
                )}
                {canDelete && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-[0.96] transition-all duration-150"
                        onClick={handleDelete}
                        disabled={convertToInvoice.isPending}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                    </Button>
                )}
            </div>
        </div>
    );
}
