"use client";

import type { SerializedInvoice } from "@/lib/types";
import { SectionCard } from "@/components/shared/section-card";
import { DateCell } from "@/components/shared/date-cell";
import Big from "big.js";

interface FactureDetailInfoProps {
    invoice: SerializedInvoice;
    progressPct: number;
}

export function FactureDetailInfo({ invoice, progressPct }: FactureDetailInfoProps) {
    return (
        <>
            <SectionCard title="Informations" contentClassName="pt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Date émission</span>
                    <DateCell value={invoice.dateEmission} className="text-xs font-medium" />
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Date échéance</span>
                    <DateCell value={invoice.dateEcheance} className="text-xs font-medium" />
                </div>
                {invoice.notes && (
                    <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">Notes</span>
                        <p className="text-xs mt-0.5">{invoice.notes}</p>
                    </div>
                )}
            </SectionCard>

            <SectionCard title="Progression du Paiement" contentClassName="pt-2">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Payé</span>
                    <span className="font-medium">{progressPct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${progressPct >= 100
                            ? "bg-emerald-500"
                            : progressPct > 0
                                ? "bg-orange-400"
                                : "bg-muted-foreground/30"
                            }`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </SectionCard>
        </>
    );
}
