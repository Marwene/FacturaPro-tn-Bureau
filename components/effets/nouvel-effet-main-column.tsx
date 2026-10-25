"use client"

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, FileText, Hash, Sparkles } from "lucide-react";
import type { NouvelEffetController } from "./use-nouvel-effet";

export function NouvelEffetMainColumn({ ctrl }: { ctrl: NouvelEffetController }) {
    const { form, set, isEMIS, suggestedDates, handleSuggestEcheance } = ctrl

    return (
        <>
            {/* Détails financiers */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="border-b bg-gradient-to-r from-emerald-500/5 to-transparent px-5 py-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Détails financiers</span>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Montant (DT)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input type="number" step="0.001" className="h-9 text-sm pl-8 font-mono font-medium" value={form.montant} onChange={(e) => set({ montant: e.target.value })} placeholder="0,000" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Ordre de paiement N°</Label>
                            <div className="relative">
                                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input className="h-9 text-sm pl-8 font-mono" value={form.ordrePaiementNumero} onChange={(e) => set({ ordrePaiementNumero: e.target.value })} placeholder="Optionnel" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Date création</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input type="date" className="h-9 text-sm pl-8" value={form.dateCreation} onChange={(e) => set({ dateCreation: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Date échéance</Label>
                            <div className="flex gap-1.5">
                                <div className="relative flex-1">
                                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                    <Input type="date" className="h-9 text-sm pl-8 flex-1" value={form.dateEcheance} onChange={(e) => set({ dateEcheance: e.target.value })} />
                                </div>
                                <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title={isEMIS ? "Voir les échéances à venir" : "Suggérer une date"} onClick={() => handleSuggestEcheance()}>
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                </Button>
                            </div>
                            {suggestedDates.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                    {suggestedDates.map((sd) => (
                                        <Badge key={sd.date} variant="outline" className="text-[10px] cursor-pointer hover:bg-muted transition-colors" onClick={() => set({ dateEcheance: sd.date })}>
                                            {sd.label}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="border-b bg-gradient-to-r from-violet-500/5 to-transparent px-5 py-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-violet-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
                </div>
                <div className="p-5">
                    <Textarea className="text-sm min-h-[72px] resize-y" value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Informations complémentaires..." />
                </div>
            </div>
        </>
    )
}
