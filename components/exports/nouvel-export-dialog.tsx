"use client";

import { useClients } from "@/hooks/use-queries";
import { useBLsWithVise, useExportMutations, useNgpCodesForExport } from "@/hooks/use-exports";
import { useExportCreateFormStore } from "@/lib/stores/export-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarcodeDisplay } from "@/components/barcode-display";
import { notify } from "@/lib/notify";
import { Plus, Trash2, Truck } from "lucide-react";
import type { SerializedNgpCode } from "@/lib/types";
import type { ExportLineForm } from "@/lib/stores/export-store";

interface NouvelExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NouvelExportDialog({ open, onOpenChange }: NouvelExportDialogProps) {
    const { data: clientsData } = useClients();
    const { data: ngpData } = useNgpCodesForExport();
    const { createExport } = useExportMutations();

    const tiersId = useExportCreateFormStore((s) => s.tiersId);
    const dateCreation = useExportCreateFormStore((s) => s.dateCreation);
    const decVente = useExportCreateFormStore((s) => s.decVente);
    const dateDecVente = useExportCreateFormStore((s) => s.dateDecVente);
    const simultanee = useExportCreateFormStore((s) => s.simultanee);
    const dateSimultanee = useExportCreateFormStore((s) => s.dateSimultanee);
    const notes = useExportCreateFormStore((s) => s.notes);
    const lines = useExportCreateFormStore((s) => s.lines);
    const selectedBlId = useExportCreateFormStore((s) => s.selectedBlId);
    const selectedBl = useExportCreateFormStore((s) => s.selectedBl);
    const setTiersId = useExportCreateFormStore((s) => s.setTiersId);
    const setDateCreation = useExportCreateFormStore((s) => s.setDateCreation);
    const setDecVente = useExportCreateFormStore((s) => s.setDecVente);
    const setDateDecVente = useExportCreateFormStore((s) => s.setDateDecVente);
    const setSimultanee = useExportCreateFormStore((s) => s.setSimultanee);
    const setDateSimultanee = useExportCreateFormStore((s) => s.setDateSimultanee);
    const setNotes = useExportCreateFormStore((s) => s.setNotes);
    const selectBl = useExportCreateFormStore((s) => s.selectBl);
    const addLine = useExportCreateFormStore((s) => s.addLine);
    const removeLine = useExportCreateFormStore((s) => s.removeLine);
    const updateLine = useExportCreateFormStore((s) => s.updateLine);
    const reset = useExportCreateFormStore((s) => s.reset);

    const { data: blsData } = useBLsWithVise(tiersId);
    const clients = clientsData?.clients ?? [];
    const clientBLs = (blsData ?? []).filter((b) => b.snNumero);

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

    const handleSubmit = () => {
        if (!tiersId) { notify.error({ title: "Client requis", error: "Sélectionnez le client destinataire de l'export." }); return; }
        if (!selectedBl) { notify.error({ title: "BL visé requis", error: "Sélectionnez un bon de livraison visé." }); return; }
        if (lines.some((l) => !l.ngpCodeId || !l.quantite || parseFloat(l.quantite) <= 0)) {
            notify.error({ title: "Export non créé", error: "Complétez toutes les lignes : code NGP et quantité supérieure à 0." }); return;
        }
        createExport.mutate(
            {
                tiersId, dateCreation,
                decVente: decVente || null, dateDecVente: dateDecVente || null,
                simultanee: simultanee || null, dateSimultanee: dateSimultanee || null,
                notes: notes || null,
                lines: lines.filter((l) => l.ngpCodeId && l.quantite && parseFloat(l.quantite) > 0).map((l) => ({
                    ngpCodeId: l.ngpCodeId, ngpCode: l.ngpCode, barcode: l.barcode,
                    quantite: parseFloat(l.quantite),
                    quantiteBL: l.quantiteBL ? parseFloat(l.quantiteBL) : null,
                    resteQuantite: l.resteQuantite ? parseFloat(l.resteQuantite) : null,
                    dateBL: l.dateBL || null,
                    bonLivraisonId: l.bonLivraisonId, bonLivraisonNumero: l.bonLivraisonNumero,
                    snNumero: l.snNumero || null,
                    invoiceId: l.invoiceId || null,
                    invoiceNumero: l.invoiceNumero || null,
                    dateFact: l.dateFact || null,
                })),
            },
            {
                onSuccess: () => { notify.success({ title: "Export créé", description: "Il apparaît dans la liste des exports." }); reset(); onOpenChange(false); },
                onError: (err) => notify.error({ title: "Export non créé", error: err, context: "création de l'export" }),
            }
        );
    };

    const handleBlSelect = (blId: string) => {
        const bl = clientBLs.find((b) => String(b.id) === String(blId));
        selectBl(bl ?? null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader><DialogTitle>Nouvel Export</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Client</Label>
                            <Select value={tiersId} onValueChange={setTiersId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                                <SelectContent>
                                    {clients.map((c) => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.raisonSociale}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Date création</Label>
                            <Input type="date" value={dateCreation} onChange={(e) => setDateCreation(e.target.value)} className="h-8 text-xs" />
                        </div>
                    </div>

                    {tiersId && (
                        <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5" /> BL Visé (source de l&apos;export)
                            </Label>
                            {clientBLs.length === 0 ? (
                                <p className="text-xs text-muted-foreground">Aucun BL avec SN Visé pour ce client.</p>
                            ) : (
                                <Select value={selectedBlId} onValueChange={handleBlSelect}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir un BL Visé..." /></SelectTrigger>
                                    <SelectContent>
                                        {clientBLs.map((bl) => (
                                            <SelectItem key={bl.id} value={bl.id} className="text-xs">
                                                {bl.numero} — SN: {bl.snNumero} ({bl.dateCreation?.split("T")[0]})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

                    {selectedBl && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><span className="text-muted-foreground">N° SN :</span><span className="ml-1 font-medium">{selectedBl.snNumero}</span></div>
                            <div><span className="text-muted-foreground">BL :</span><span className="ml-1 font-medium">{selectedBl.numero}</span></div>
                            <div><span className="text-muted-foreground">Date BL :</span><span className="ml-1 font-medium">{selectedBl.dateCreation?.split("T")[0]}</span></div>
                            <div><span className="text-muted-foreground">Qté BL :</span><span className="ml-1 font-medium">{selectedBl.lines.reduce((s, l) => s + parseFloat(l.quantite || "0"), 0).toFixed(3)}</span></div>
                            {selectedBl.invoice && (
                                <>
                                    <div><span className="text-muted-foreground">Facture (SN lié) :</span><span className="ml-1 font-medium">{selectedBl.invoice.numero}</span></div>
                                    <div><span className="text-muted-foreground">Date facture :</span><span className="ml-1 font-medium">{selectedBl.invoice.dateEmission?.split("T")[0]}</span></div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">DEC Vente</Label><Input value={decVente} onChange={(e) => setDecVente(e.target.value)} placeholder="N° déclaration" className="h-8 text-xs" /></div>
                        <div className="space-y-1"><Label className="text-xs">Date DEC</Label><Input type="date" value={dateDecVente} onChange={(e) => setDateDecVente(e.target.value)} className="h-8 text-xs" /></div>
                        <div className="space-y-1"><Label className="text-xs">Simultanée</Label><Input value={simultanee} onChange={(e) => setSimultanee(e.target.value)} placeholder="N° déclaration" className="h-8 text-xs" /></div>
                        <div className="space-y-1"><Label className="text-xs">Date Simultanée</Label><Input type="date" value={dateSimultanee} onChange={(e) => setDateSimultanee(e.target.value)} className="h-8 text-xs" /></div>
                    </div>

                    {selectedBl && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Lignes d&apos;export</Label>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addLine}>
                                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                                </Button>
                            </div>
                            <div className="border rounded-lg overflow-x-hidden">
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs w-[22%]">Code NGP</TableHead>
                                            <TableHead className="text-xs w-[14%]">Code Barre</TableHead>
                                            <TableHead className="text-xs w-[9%] text-right">Qté</TableHead>
                                            <TableHead className="text-xs w-[9%] text-right">Qté BL</TableHead>
                                            <TableHead className="text-xs w-[9%] text-right">Reste</TableHead>
                                            <TableHead className="text-xs w-[9%]">Date BL</TableHead>
                                            <TableHead className="text-xs w-[8%]">N° BL</TableHead>
                                            <TableHead className="text-xs w-[8%]">N° Facture</TableHead>
                                            <TableHead className="text-xs w-[8%]">Date Facture</TableHead>
                                            <TableHead className="w-[4%]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lines.map((line) => {
                                            const reste = parseFloat(line.resteQuantite || "0") || 0;
                                            const resteClass = reste === 0
                                                ? "text-emerald-600 font-medium"
                                                : "text-red-600 font-medium";
                                            return (
                                            <TableRow key={line.id}>
                                                <TableCell className="truncate">
                                                    <Select value={line.ngpCodeId} onValueChange={(v) => handleUpdateLine(line.id, "ngpCodeId", v)}>
                                                        <SelectTrigger className="h-7 text-xs max-w-full"><SelectValue placeholder="NGP..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {(ngpData?.codes ?? []).map((code: SerializedNgpCode) => (
                                                                <SelectItem key={code.id} value={code.id} className="text-xs font-mono">
                                                                    {code.code} {code.description ? `— ${code.description}` : ""}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell><BarcodeDisplay value={line.barcode} compact /></TableCell>
                                                <TableCell><Input type="number" step="0.001" value={line.quantite} onChange={(e) => handleUpdateLine(line.id, "quantite", e.target.value)} className="h-7 text-xs text-right" placeholder="0" /></TableCell>
                                                <TableCell><Input type="number" step="0.001" value={line.quantiteBL} onChange={(e) => handleUpdateLine(line.id, "quantiteBL", e.target.value)} className="h-7 text-xs text-right" placeholder="0" /></TableCell>
                                                <TableCell><Input type="number" step="0.001" value={line.resteQuantite} readOnly className={`h-7 text-xs text-right bg-muted/30 ${resteClass}`} placeholder="0" /></TableCell>
                                                <TableCell><Input type="date" value={line.dateBL} onChange={(e) => handleUpdateLine(line.id, "dateBL", e.target.value)} className="h-7 text-xs" /></TableCell>
                                                <TableCell className="truncate"><span className="text-xs truncate block">{line.bonLivraisonNumero}</span></TableCell>
                                                <TableCell><Input value={line.invoiceNumero} onChange={(e) => handleUpdateLine(line.id, "invoiceNumero", e.target.value)} placeholder="N°" className="h-7 text-xs" /></TableCell>
                                                <TableCell><Input type="date" value={line.dateFact} onChange={(e) => handleUpdateLine(line.id, "dateFact", e.target.value)} className="h-7 text-xs" /></TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" disabled={lines.length <= 1} onClick={() => removeLine(line.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="h-16 text-xs resize-none" placeholder="Notes optionnelles..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>Annuler</Button>
                    <Button size="sm" onClick={handleSubmit} disabled={createExport.isPending || !selectedBl}>
                        {createExport.isPending ? "Création..." : "Créer l'export"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
