"use client"

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Plus, Receipt, X } from "lucide-react";
import { MoneyCell } from "@/components/shared/money-cell";
import { cn } from "@/lib/utils";
import type { NouvelEffetController } from "./use-nouvel-effet";

export function NouvelEffetSidebar({ ctrl }: { ctrl: NouvelEffetController }) {
    const {
        isRECU, isEMIS, form, set, montantNum, totalSelected, splitWarning,
        entityId, documents, selectedDocIds, toggleDoc,
        handleAddAchat, handleRemoveAchat, handleAchatChange,
    } = ctrl

    return (
        <div className="space-y-4 lg:sticky lg:top-6">
            {/* Récapitulatif */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="border-b bg-gradient-to-r from-amber-500/5 to-transparent px-4 py-2.5 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Récapitulatif</span>
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type</span>
                        <Badge variant={isRECU ? "default" : "secondary"} className="text-[10px]">{isRECU ? "Reçu" : "Émis"}</Badge>
                    </div>
                    <Separator />
                    <div>
                        <span className="text-xs text-muted-foreground">Montant</span>
                        <p className="text-xl font-bold tracking-tight mt-0.5">
                            {form.montant ? `${montantNum.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT` : "0,000 DT"}
                        </p>
                    </div>
                    <Separator />
                    <div>
                        <span className="text-xs text-muted-foreground">Échéance</span>
                        <p className="text-sm font-medium mt-0.5">
                            {form.dateEcheance ? new Date(form.dateEcheance).toLocaleDateString("fr-TN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "Non définie"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Documents liés */}
            {entityId && documents.length > 0 && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="border-b bg-gradient-to-r from-sky-500/5 to-transparent px-4 py-2.5 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-sky-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {isRECU ? "Factures impayées" : "Achats impayés"}
                        </span>
                        <Badge variant="outline" className="ml-auto text-[10px]">{selectedDocIds.length}/{documents.length}</Badge>
                    </div>
                    <div className="p-3 space-y-1 max-h-[280px] overflow-y-auto">
                        {documents.map((doc) => {
                            const checked = selectedDocIds.includes(doc.id)
                            const reste = parseFloat(doc.resteAPayer ?? doc.totalTTC)
                            return (
                                <div
                                    key={doc.id}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-all",
                                        checked ? "bg-primary/5 ring-1 ring-primary/10" : "hover:bg-muted/50"
                                    )}
                                    onClick={() => toggleDoc(doc.id)}
                                >
                                    <Checkbox checked={checked} onCheckedChange={() => toggleDoc(doc.id)} className="h-4 w-4" />
                                    <span className="flex-1 font-mono text-xs truncate">{doc.numero}</span>
                                    <MoneyCell value={reste.toString()} className="font-medium text-xs" />
                                </div>
                            )
                        })}
                    </div>
                    {selectedDocIds.length > 0 && (
                        <div className="border-t bg-muted/10 px-3 py-2.5 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Total sélectionné</span>
                            <MoneyCell value={totalSelected.toFixed(3)} className="text-sm font-bold" />
                        </div>
                    )}
                </div>
            )}

            {/* Split warning */}
            {splitWarning && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/10 dark:border-amber-800 overflow-hidden">
                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Montant insuffisant</p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
                                    Dû: <strong><MoneyCell value={totalSelected.toFixed(3)} /></strong><br />
                                    Saisi: <strong><MoneyCell value={montantNum.toFixed(3)} /></strong><br />
                                    Restant: <strong><MoneyCell value={(totalSelected - montantNum).toFixed(3)} /></strong>
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 text-[10px] gap-1 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700"
                                    type="button"
                                    onClick={() => set({ montant: totalSelected.toFixed(3) })}
                                >
                                    Ajuster au total
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EMIS: Achats liés manuels */}
            {isEMIS && (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="border-b bg-gradient-to-r from-orange-500/5 to-transparent px-4 py-2.5 flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-orange-500" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achats liés</span>
                    </div>
                    <div className="p-3 space-y-2">
                        {form.achatsLies.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-3">Aucun achat lié</p>
                        )}
                        {form.achatsLies.map((a, idx) => {
                            const linkedDoc = documents.find((d) => d.id === a.achatId)
                            return (
                                <div key={idx} className="flex items-end gap-2">
                                    <div className="flex-1 min-w-0">
                                        <Label className="text-[10px] text-muted-foreground">N° Achat</Label>
                                        {linkedDoc ? (
                                            <div className="h-8 px-3 flex items-center rounded-md border bg-muted/40">
                                                <span className="text-xs font-mono">{linkedDoc.numero}</span>
                                            </div>
                                        ) : (
                                            <Input className="h-8 text-xs" value={a.achatId} onChange={(e) => handleAchatChange(idx, "achatId", e.target.value)} />
                                        )}
                                    </div>
                                    <div className="w-24 shrink-0">
                                        <Label className="text-[10px] text-muted-foreground">Montant</Label>
                                        <Input type="number" step="0.001" className="h-8 text-xs" value={a.montantAlloue} onChange={(e) => handleAchatChange(idx, "montantAlloue", e.target.value)} />
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" type="button" onClick={() => handleRemoveAchat(idx)}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )
                        })}
                        <Button variant="outline" size="sm" type="button" className="w-full mt-1" onClick={handleAddAchat}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter un achat
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
