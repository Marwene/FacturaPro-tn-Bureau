"use client"

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { MoneyCell } from "@/components/shared/money-cell";
import { DateCell } from "@/components/shared/date-cell";
import { ConfirmDialog } from "@/components/confirm-delete-dialog";
import { SplitCreationSection, SplitEcheancesSection } from "./nouvel-effet-split-sections";
import type { NouvelEffetController } from "./use-nouvel-effet";

export function NouvelEffetSplitDialog({ ctrl }: { ctrl: NouvelEffetController }) {
    const {
        echeancesOpen, setEcheancesOpen, setCreatedEffets, setSplitDirty,
        autoRepartirConfirmOpen, setAutoRepartirConfirmOpen, applyAutoRepartir,
        createdEffets, handleCreateOthers,
    } = ctrl

    return (
        <Dialog open={echeancesOpen} onOpenChange={(open) => {
            setEcheancesOpen(open)
            if (!open) {
                setCreatedEffets([])
                setSplitDirty(false)
            }
        }}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Assistant de création d&apos;effets</DialogTitle>
                    <DialogDescription>
                        Consultez les échéances à venir, puis découpez les achats sélectionnés en plusieurs effets EMIS.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-auto space-y-5 pr-1">
                    <SplitEcheancesSection ctrl={ctrl} />

                    <Separator />

                    <SplitCreationSection ctrl={ctrl} />

                    {/* Section 3 — Confirmation */}
                    {createdEffets.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirmation</span>
                                </div>
                                <div className="space-y-2">
                                    {createdEffets.map((effet) => (
                                        <div key={effet.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-mono font-semibold">{effet.numero}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    <MoneyCell value={effet.montant} /> · <DateCell value={effet.dateEcheance} />
                                                </p>
                                            </div>
                                            <Badge variant={effet.splitTotal && effet.splitTotal > 1 ? "secondary" : "outline"} className="text-[10px] shrink-0">
                                                {effet.splitTotal && effet.splitTotal > 1 ? `Split ${effet.splitIndex}/${effet.splitTotal}` : "Simple"}
                                            </Badge>
                                            <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" asChild>
                                                <Link href={`/effets/${effet.id}`}>Voir le détail</Link>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="outline" size="sm" type="button" className="h-8 text-xs" onClick={() => setEcheancesOpen(false)}>
                                        Retour à la liste
                                    </Button>
                                    <Button variant="outline" size="sm" type="button" className="h-8 text-xs" onClick={handleCreateOthers}>
                                        Créer d&apos;autres effets
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>

            <ConfirmDialog
                open={autoRepartirConfirmOpen}
                onOpenChange={setAutoRepartirConfirmOpen}
                onConfirm={applyAutoRepartir}
                title="Répartir automatiquement ?"
                description="Répartir automatiquement remplacera la répartition actuelle."
                variant="default"
                icon={Sparkles}
                confirmLabel="Répartir"
            />
        </Dialog>
    )
}
