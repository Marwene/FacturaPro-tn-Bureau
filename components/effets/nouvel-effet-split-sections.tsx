"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ArrowRightLeft, Calendar, ChevronLeft, ChevronRight, Loader2, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { MoneyCell } from "@/components/shared/money-cell";
import { DateCell } from "@/components/shared/date-cell";
import { cn } from "@/lib/utils";
import { SplitRowEcheanceCollision } from "./split-row-echeance-collision";
import { echeanceJoursLabel, echeanceJoursTone, formatMontantDT, horizons, sumRowAllocations } from "./nouvel-effet-split-logic";
import type { NouvelEffetController } from "./use-nouvel-effet";

export function SplitEcheancesSection({ ctrl }: { ctrl: NouvelEffetController }) {
    const {
        echeancesLoading, echeances, handleSuggestEcheance,
        horizon, setHorizon, setEcheancePage, echeancePage,
        pageFrom, pageTo, totalEcheances, totalPages,
    } = ctrl

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Échéances à venir</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
                {horizons.map((h) => (
                    <button
                        key={h.label}
                        type="button"
                        onClick={() => { setHorizon(h.value); setEcheancePage(1) }}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                            horizon === h.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:bg-muted",
                        )}
                    >
                        {h.label}
                    </button>
                ))}
            </div>

            {echeancesLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
                </div>
            ) : echeances.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Aucune échéance à venir</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs">Fournisseur</TableHead>
                            <TableHead className="text-xs">N° effet</TableHead>
                            <TableHead className="text-xs">Date échéance</TableHead>
                            <TableHead className="text-xs text-right">Montant</TableHead>
                            <TableHead className="text-xs text-right">J-xx</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {echeances.map((e) => (
                            <TableRow key={e.id} className="cursor-pointer" onClick={() => handleSuggestEcheance(e)}>
                                <TableCell className="text-xs">{e.fournisseur}</TableCell>
                                <TableCell className="text-xs font-mono">{e.numero}</TableCell>
                                <TableCell className="text-xs"><DateCell value={e.dateEcheance} /></TableCell>
                                <TableCell className="text-xs text-right font-medium"><MoneyCell value={e.montant} /></TableCell>
                                <TableCell className="text-xs text-right">
                                    <span className={echeanceJoursTone(e.joursDepuisAujourdhui)}>
                                        {echeanceJoursLabel(e.joursDepuisAujourdhui)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={echeancePage <= 1} onClick={() => setEcheancePage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />Précédent
                </Button>
                <span className="text-xs text-muted-foreground">{pageFrom}–{pageTo} sur {totalEcheances}</span>
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={echeancePage >= totalPages} onClick={() => setEcheancePage((p) => p + 1)}>
                    Suivant<ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
            </div>
        </div>
    )
}

export function SplitCreationSection({ ctrl }: { ctrl: NouvelEffetController }) {
    const {
        isEMIS, selectedDocIds, selectedDocs,
        addSplitRow, handleAutoRepartir,
        totalACouvrir, totalReparti, splitErrors,
        splitRows, updateSplitRow, removeSplitRow, updateSplitAlloc, removeSplitAlloc, addSplitAlloc,
        splitValid, isCreatingSplit, handleCreateSplit,
    } = ctrl

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Création d&apos;effets (split)</span>
            </div>

            {!isEMIS || selectedDocIds.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        Sélectionnez d&apos;abord des achats impayés dans la section &quot;Achats liés&quot; (le découpage EMIS s&apos;applique aux achats).
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" type="button" className="h-8 text-xs" onClick={addSplitRow}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter un effet
                        </Button>
                        <Button variant="outline" size="sm" type="button" className="h-8 text-xs" onClick={handleAutoRepartir}>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />Tout répartir automatiquement
                        </Button>
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                        <p className="text-xs">
                            <span className="text-muted-foreground">Total à couvrir : </span>
                            <span className="font-semibold tabular-nums">{formatMontantDT(totalACouvrir)}</span>
                            <span className="text-muted-foreground"> — Réparti : </span>
                            <span className="font-semibold tabular-nums">{formatMontantDT(totalReparti)}</span>
                        </p>
                        {splitErrors.length > 0 && (
                            <ul className="space-y-1">
                                {splitErrors.map((err, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                        <span>{err}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="space-y-3">
                        {splitRows.map((row, rowIdx) => {
                            const rowTotal = sumRowAllocations(row)
                            return (
                                <div key={row.id} className="rounded-lg border p-3 space-y-3">
                                    <div className="flex items-end gap-2">
                                        <div className="shrink-0">
                                            <p className="h-8 flex items-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">Effet #{rowIdx + 1}</p>
                                        </div>
                                        <div className="w-28 shrink-0">
                                            <Label className="text-[10px] text-muted-foreground">N° ordre de paiement</Label>
                                            <Input className="h-8 text-xs" value={row.ordrePaiementNumero} onChange={(e) => updateSplitRow(row.id, "ordrePaiementNumero", e.target.value)} />
                                        </div>
                                        <div className="w-44 shrink-0">
                                            <Label className="text-[10px] text-muted-foreground">Date échéance</Label>
                                            <div className="flex items-center gap-1">
                                                <Input type="date" className="h-8 text-xs flex-1 min-w-0" value={row.dateEcheance} onChange={(e) => updateSplitRow(row.id, "dateEcheance", e.target.value)} />
                                                <SplitRowEcheanceCollision date={row.dateEcheance} />
                                            </div>
                                        </div>
                                        <div className="flex-1 text-right">
                                            <Label className="text-[10px] text-muted-foreground justify-end">Montant</Label>
                                            <p className="h-8 flex items-center justify-end font-mono text-sm font-semibold tabular-nums">{formatMontantDT(rowTotal)}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" type="button" onClick={() => removeSplitRow(row.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <div className="space-y-1.5">
                                        {row.allocations.map((alloc, allocIdx) => (
                                            <div key={allocIdx} className="flex items-center gap-2">
                                                <Select value={alloc.achatId} onValueChange={(v) => updateSplitAlloc(row.id, allocIdx, "achatId", v)}>
                                                    <SelectTrigger className="h-8 flex-1 text-xs">
                                                        <SelectValue placeholder="Sélectionner un achat" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {selectedDocs.map((d) => (
                                                            <SelectItem key={d.id} value={d.id} className="text-xs">
                                                                {d.numero} — <MoneyCell value={d.resteAPayer ?? d.totalTTC} />
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    step="0.001"
                                                    className="h-8 w-32 shrink-0 text-xs"
                                                    value={alloc.montant}
                                                    placeholder="0,000"
                                                    onChange={(e) => updateSplitAlloc(row.id, allocIdx, "montant", e.target.value)}
                                                />
                                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" type="button" onClick={() => removeSplitAlloc(row.id, allocIdx)}>
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <Button variant="outline" size="sm" type="button" className="h-7 text-xs" onClick={() => addSplitAlloc(row.id)}>
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter un achat
                                    </Button>
                                </div>
                            )
                        })}
                    </div>

                    <Button type="button" className="w-full" disabled={!splitValid || isCreatingSplit} onClick={handleCreateSplit}>
                        {isCreatingSplit ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                        Créer {splitRows.length} effet(s)
                    </Button>
                </>
            )}
        </div>
    )
}
