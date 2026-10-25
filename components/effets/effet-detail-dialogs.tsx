"use client"

import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/form-field"
import { MoneyCell } from "@/components/shared/money-cell"
import { computeEscompte, type EffetForDetail } from "./effet-detail-logic"
import type { useEffetDetailActions } from "./use-effet-detail-actions"

interface EffetDetailDialogsProps {
    effet: EffetForDetail
    isRECU: boolean
    actions: ReturnType<typeof useEffetDetailActions>
}

export function EffetDetailDialogs({ effet, isRECU, actions }: EffetDetailDialogsProps) {
    const { actionDialog, actionData, handleAction, handleFieldChange, isEscompteRecu, tmm, tmmLoading } = actions
    const escompte = computeEscompte(effet.montant, actionData.tauxEscompte ?? "0")

    return (
        <>
            {/* Action dialogs */}
            <Dialog open={!!actionDialog} onOpenChange={(o) => { if (!o) actions.setActionDialog(null) }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{actionDialog?.title}</DialogTitle>
                        <DialogDescription>Confirmez sur {effet.numero}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {actionDialog?.fields?.map((f) => (
                            <FormField key={f.key} label={f.label} className="gap-1">
                                <Input type={f.type} className="h-8 text-sm" value={actionData[f.key] ?? ""}
                                    onChange={(e) => handleFieldChange(f.key, e.target.value)} />
                                {isEscompteRecu && f.key === "tauxEscompte" && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {tmmLoading
                                            ? "Chargement du TMM…"
                                            : tmm
                                                ? `TMM ${tmm}% + 3% banque`
                                                : "TMM indisponible — saisir manuellement"}
                                    </p>
                                )}
                            </FormField>
                        ))}
                        {isEscompteRecu && (
                            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Valeur nominale</span>
                                    <MoneyCell value={effet.montant} className="font-medium" />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Escompte ({actionData.tauxEscompte ?? "0"}%)</span>
                                    <span className="text-red-600">-<MoneyCell value={escompte} /></span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs font-medium">Net encaissé</span>
                                    <MoneyCell value={actionData.netEncaisse} className="font-bold text-emerald-600" />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => actions.setActionDialog(null)}>Annuler</Button>
                        <Button size="sm" onClick={handleAction}>Confirmer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation paiement */}
            <Dialog open={actions.confirmPayOpen} onOpenChange={actions.setConfirmPayOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirmer le paiement</DialogTitle>
                        <DialogDescription>
                            Confirmez que le paiement de cet effet a bien été effectué. Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Effet</span>
                            <span className="font-mono font-medium">{effet.numero}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Montant</span>
                            <MoneyCell value={effet.montant} className="font-semibold" />
                        </div>
                        {isRECU && effet.netEncaisse && (
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Net encaissé</span>
                                <div className="text-right">
                                    <MoneyCell value={effet.netEncaisse} className="font-semibold text-emerald-600" />
                                    {effet.invoice && (
                                        <p className="text-[10px] text-muted-foreground">appliqué à la facture {effet.invoice.numero}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {effet.invoice && (
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Facture liée</span>
                                <span className="font-mono font-medium">{effet.invoice.numero}</span>
                            </div>
                        )}
                        {isRECU && effet.invoice && (
                            <p className="text-[11px] text-muted-foreground pt-1">
                                {effet.netEncaisse
                                    ? `Le net encaissé sera enregistré en trésorerie et appliqué à la facture ${effet.invoice.numero} (montant payé / reste à payer).`
                                    : `Le paiement sera enregistré et la facture ${effet.invoice.numero} mise à jour (montant payé / reste à payer).`}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => actions.setConfirmPayOpen(false)}>Annuler</Button>
                        <Button size="sm" onClick={actions.confirmPay}>
                            Confirmer le paiement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
