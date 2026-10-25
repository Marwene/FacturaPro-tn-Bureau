"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { MoneyCell } from "@/components/shared/money-cell"
import { formatDateShort } from "@/lib/utils"
import {
    Banknote, Percent, Landmark, ArrowLeftRight, Ban, CheckCircle2,
    Printer, AlertTriangle,
} from "lucide-react"
import type { EffetForDetail, PayEligibilityInfo } from "./effet-detail-logic"
import type { useEffetDetailActions } from "./use-effet-detail-actions"

interface EffetDetailSidebarProps {
    effet: EffetForDetail
    payEligibility: PayEligibilityInfo
    actions: ReturnType<typeof useEffetDetailActions>
}

export function EffetDetailSidebar({ effet, payEligibility, actions }: EffetDetailSidebarProps) {
    return (
        <div className="space-y-4">
            <div className="sticky top-20 space-y-4">
                {/* Financier */}
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financier</span>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Valeur nominale</span>
                            <MoneyCell value={effet.montant} className="font-bold text-base" />
                        </div>
                        {effet.tauxEscompte && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" />Taux</span>
                                <span>{effet.tauxEscompte}%</span>
                            </div>
                        )}
                        {effet.frais && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Escompte</span>
                                <span className="text-red-600">-<MoneyCell value={effet.frais} /></span>
                            </div>
                        )}
                        {effet.netEncaisse && (
                            <>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium">Net encaissé</span>
                                    <MoneyCell value={effet.netEncaisse} className="font-bold text-emerald-600" />
                                </div>
                            </>
                        )}
                        {effet.fraisProtet && (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Protêt</span>
                                <MoneyCell value={effet.fraisProtet} className="text-red-600" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/20">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>
                    </div>
                    <div className="p-2 space-y-1">
                        {effet.type === "EMIS" && (
                            <Button variant="default" size="sm" className="w-full justify-start gap-2 text-xs h-8" onClick={() => actions.setShowPreview(true)}>
                                <Printer className="h-3.5 w-3.5" /> Aperçu / Imprimer
                            </Button>
                        )}
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8"
                            onClick={() => actions.setActionDialog({
                                action: "REMIS_ESCOMPTE", title: "Remettre à l'escompte", fields: [
                                    { key: "tauxEscompte", label: "Taux (%)", type: "number" },
                                    { key: "netEncaisse", label: "Net encaissé (DT)", type: "number" },
                                ]
                            })}
                            disabled={effet.status !== "EN_PORTEFEUILLE"}>
                            <Landmark className="h-3.5 w-3.5" /> Escompte
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8"
                            onClick={() => actions.setActionDialog({ action: "ENDOSSE", title: "Endosser", fields: [{ key: "endosseA", label: "Endossé à", type: "text" }] })}
                            disabled={effet.status !== "EN_PORTEFEUILLE"}>
                            <ArrowLeftRight className="h-3.5 w-3.5" /> Endosser
                        </Button>
                        <Button variant="destructive" size="sm" className="w-full justify-start gap-2 text-xs h-8"
                            onClick={() => actions.setActionDialog({
                                action: "IMPAYE", title: "Marquer impayé", fields: [
                                    { key: "motifImpaye", label: "Motif", type: "text" },
                                    { key: "fraisProtet", label: "Frais de protêt (DT)", type: "number" },
                                ]
                            })}
                            disabled={effet.status !== "REMIS_ESCOMPTE" && effet.status !== "ENDOSSE"}>
                            <Ban className="h-3.5 w-3.5" /> Impayé
                        </Button>
                        <Separator className="my-1" />
                        {effet.status !== "PAYE" && effet.status !== "ANNULE" && payEligibility && (
                            <div className={`px-3 py-2 rounded-lg text-[11px] leading-relaxed ${payEligibility.canPay
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                                }`}>
                                {payEligibility.canPay ? (
                                    <>
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Paiement autorisé
                                        </span>
                                        <span className="mt-1 block opacity-80">
                                            {payEligibility.hoursElapsed}h ouvrées écoulées (min. {payEligibility.hoursRequired}h).
                                            {effet.invoice && <> La facture {effet.invoice.numero} sera mise à jour.</>}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Paiement en attente
                                        </span>
                                        <span className="mt-1 block opacity-80">
                                            {payEligibility.hoursElapsed}h / {payEligibility.hoursRequired}h ouvrées — payable à partir du {formatDateShort(payEligibility.payableAt) || "—"}.
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                        <Button variant="default" size="sm" className="w-full justify-start gap-2 text-xs h-8"
                            onClick={() => actions.setConfirmPayOpen(true)}
                            disabled={effet.status === "PAYE" || effet.status === "ANNULE" || !payEligibility?.canPay}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Payé
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8 text-red-600 hover:text-red-700"
                            onClick={actions.cancelEffet}
                            disabled={effet.status === "PAYE" || effet.status === "ANNULE"}>
                            <Ban className="h-3.5 w-3.5" /> Annuler
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
