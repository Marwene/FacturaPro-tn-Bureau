"use client";

import { useExportMutations, useNgpCodesForExport, useBLSnNumbers } from "@/hooks/use-exports";
import { useExportEditFormStore } from "@/lib/stores/export-store";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { Save, X } from "lucide-react";
import type { SerializedExport, SerializedNgpCode } from "@/lib/types";
import type { ExportLineForm } from "@/lib/stores/export-store";
import { ModifierExportDeclarations } from "./modifier-export-declarations";
import { ModifierExportLines } from "./modifier-export-lines";

const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
        BROUILLON: "bg-gray-100 text-gray-700 border-gray-200",
        EN_COURS: "bg-gray-100 text-gray-700 border-gray-200",
        VALIDE: "bg-emerald-50 text-emerald-700 border-emerald-200",
        ANNULE: "bg-red-50 text-red-700 border-red-200",
    };
    const labels: Record<string, string> = {
        BROUILLON: "Brouillon",
        EN_COURS: "En cours",
        VALIDE: "Validé",
        ANNULE: "Annulé",
    };
    return (
        <Badge variant="outline" className={`text-xs ${variants[status] ?? ""}`}>
            {labels[status] ?? status}
        </Badge>
    );
};

interface ModifierExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exportData: SerializedExport;
}

export function ModifierExportDialog({ open, onOpenChange, exportData }: ModifierExportDialogProps) {
    const { data: ngpData } = useNgpCodesForExport();
    const { updateExport } = useExportMutations();

    const decVente = useExportEditFormStore((s) => s.decVente);
    const dateDecVente = useExportEditFormStore((s) => s.dateDecVente);
    const simultanee = useExportEditFormStore((s) => s.simultanee);
    const dateSimultanee = useExportEditFormStore((s) => s.dateSimultanee);
    const notes = useExportEditFormStore((s) => s.notes);
    const status = useExportEditFormStore((s) => s.status);
    const lines = useExportEditFormStore((s) => s.lines);
    const setDecVente = useExportEditFormStore((s) => s.setDecVente);
    const setDateDecVente = useExportEditFormStore((s) => s.setDateDecVente);
    const setSimultanee = useExportEditFormStore((s) => s.setSimultanee);
    const setDateSimultanee = useExportEditFormStore((s) => s.setDateSimultanee);
    const setNotes = useExportEditFormStore((s) => s.setNotes);
    const setStatus = useExportEditFormStore((s) => s.setStatus);
    const addLine = useExportEditFormStore((s) => s.addLine);
    const removeLine = useExportEditFormStore((s) => s.removeLine);
    const updateLine = useExportEditFormStore((s) => s.updateLine);
    const resetForm = useExportEditFormStore((s) => s.reset);

    const bonLivraisonIds = [...new Set(lines.map((l) => l.bonLivraisonId).filter(Boolean) as string[])];
    const { data: snNumbers } = useBLSnNumbers(bonLivraisonIds);

    const handleUpdateLine = (id: string, field: string, value: string) => {
        if (field === "ngpCodeId" && ngpData?.codes) {
            const code = (ngpData.codes as SerializedNgpCode[]).find((c) => c.id === value);
            if (code) {
                updateLine(id, "ngpCodeId", value);
                updateLine(id, "ngpCode", code.code);
                updateLine(id, "barcode", code.barcode ?? "");
                return;
            }
        }
        updateLine(id, field as keyof ExportLineForm, value);
        if (field === "quantite" || field === "quantiteBL") {
            const line = lines.find((l) => l.id === id);
            if (line) {
                const qte = parseFloat(field === "quantite" ? value : line.quantite || "0");
                const qteBLRaw = field === "quantiteBL" ? value : line.quantiteBL;
                if (field === "quantiteBL" || (qteBLRaw && qteBLRaw.trim() !== "")) {
                    const qteBL = parseFloat(qteBLRaw || "0");
                    if (!isNaN(qte) && !isNaN(qteBL)) {
                        updateLine(id, "resteQuantite", (qteBL - qte).toFixed(3));
                    }
                }
            }
        }
    };

    const handleSave = () => {
        if (lines.some((l) => !l.ngpCodeId || !l.quantite || parseFloat(l.quantite) <= 0)) {
            notify.error({ title: "Export non modifié", error: "Complétez toutes les lignes : code NGP et quantité supérieure à 0." });
            return;
        }
        updateExport.mutate(
            {
                id: exportData.id,
                decVente: decVente || null,
                dateDecVente: dateDecVente || null,
                simultanee: simultanee || null,
                dateSimultanee: dateSimultanee || null,
                notes: notes || null,
                status,
                lines: lines.filter((l) => l.ngpCodeId && l.quantite && parseFloat(l.quantite) > 0).map((l) => ({
                    ngpCodeId: l.ngpCodeId,
                    ngpCode: l.ngpCode,
                    barcode: l.barcode,
                    quantite: parseFloat(l.quantite),
                    quantiteBL: l.quantiteBL ? parseFloat(l.quantiteBL) : null,
                    resteQuantite: l.resteQuantite ? parseFloat(l.resteQuantite) : null,
                    bonLivraisonId: l.bonLivraisonId || null,
                    bonLivraisonNumero: l.bonLivraisonNumero || null,
                    snNumero: l.snNumero || null,
                    dateBL: l.dateBL || null,
                    invoiceId: l.invoiceId || null,
                    invoiceNumero: l.invoiceNumero || null,
                    dateFact: l.dateFact || null,
                })),
            },
            {
                onSuccess: () => {
                    notify.success({ title: `Export ${exportData.numero} modifié` });
                    resetForm();
                    onOpenChange(false);
                },
                onError: (err) => notify.error({ title: "Export non modifié", error: err, context: "modification de l'export" }),
            }
        );
    };

    const closeDialog = () => {
        resetForm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0">
                <div className="border-b px-6 py-4">
                    <div className="flex items-center gap-3 mb-1.5">
                        {statusBadge(status)}
                        <DialogTitle className="text-lg">Modifier {exportData.numero}</DialogTitle>
                    </div>
                    <DialogDescription className="text-xs">
                        {exportData.tiers?.raisonSociale ?? ""}
                        {exportData.dateCreation && <> &middot; Créé le {formatDate(exportData.dateCreation)}</>}
                        {snNumbers && snNumbers.length > 0 && <> &middot; N° SN: {snNumbers.join(", ")}</>}
                    </DialogDescription>
                </div>

                <div className="px-6 py-4 space-y-5">
                    <ModifierExportDeclarations
                        status={status}
                        decVente={decVente}
                        dateDecVente={dateDecVente}
                        simultanee={simultanee}
                        dateSimultanee={dateSimultanee}
                        notes={notes}
                        onStatusChange={setStatus}
                        onDecVenteChange={setDecVente}
                        onDateDecVenteChange={setDateDecVente}
                        onSimultaneeChange={setSimultanee}
                        onDateSimultaneeChange={setDateSimultanee}
                        onNotesChange={setNotes}
                    />

                    <ModifierExportLines
                        lines={lines}
                        ngpCodes={(ngpData?.codes ?? []) as { id: string; code: string; description?: string }[]}
                        onAddLine={addLine}
                        onRemoveLine={removeLine}
                        onUpdateLine={handleUpdateLine}
                    />
                </div>

                <DialogFooter className="border-t px-6 py-3 bg-muted/20">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-muted-foreground">
                            {lines.length} ligne{lines.length > 1 ? "s" : ""}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={closeDialog} className="gap-1.5">
                                <X className="h-3.5 w-3.5" />
                                Annuler
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={updateExport.isPending} className="gap-1.5">
                                <Save className="h-3.5 w-3.5" />
                                {updateExport.isPending ? "Enregistrement..." : "Enregistrer"}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
