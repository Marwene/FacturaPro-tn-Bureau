"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { BarcodeDisplay } from "@/components/barcode-display";
import { Plus, Trash2 } from "lucide-react";
import type { ExportLineForm } from "@/lib/stores/export-store-shared";

interface ModifierExportLinesProps {
    lines: ExportLineForm[];
    ngpCodes: { id: string; code: string; description?: string }[];
    onAddLine: () => void;
    onRemoveLine: (id: string) => void;
    onUpdateLine: (id: string, field: string, value: string) => void;
}

export function ModifierExportLines({ lines, ngpCodes, onAddLine, onRemoveLine, onUpdateLine }: ModifierExportLinesProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Lignes d&apos;export</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onAddLine}>
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une ligne
                </Button>
            </div>
            <div className="space-y-2">
                {lines.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                        Aucune ligne. Cliquez sur &quot;Ajouter une ligne&quot;.
                    </div>
                ) : (
                    lines.map((line) => (
                        <Card key={line.id} className="relative">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Code NGP</Label>
                                        <Select value={line.ngpCodeId} onValueChange={(v) => onUpdateLine(line.id, "ngpCodeId", v)}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Sélectionner un NGP..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ngpCodes.map((code) => (
                                                    <SelectItem key={code.id} value={code.id} className="text-xs font-mono">
                                                        {code.code} {code.description ? `— ${code.description}` : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-40 shrink-0">
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Code Barre</Label>
                                        <BarcodeDisplay value={line.barcode} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Quantité</Label>
                                        <Input type="number" step="0.001" value={line.quantite}
                                            onChange={(e) => onUpdateLine(line.id, "quantite", e.target.value)}
                                            className="h-8 text-xs text-right" placeholder="0" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Qté BL</Label>
                                        <Input type="number" step="0.001" value={line.quantiteBL}
                                            onChange={(e) => onUpdateLine(line.id, "quantiteBL", e.target.value)}
                                            className="h-8 text-xs text-right" placeholder="0" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Reste</Label>
                                        <Input type="number" step="0.001" value={line.resteQuantite}
                                            readOnly
                                            className={`h-8 text-xs text-right bg-muted/30 ${parseFloat(line.resteQuantite || "0") === 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}`} placeholder="0" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">N° BL</Label>
                                        <Input value={line.bonLivraisonNumero}
                                            onChange={(e) => onUpdateLine(line.id, "bonLivraisonNumero", e.target.value)}
                                            className="h-8 text-xs" placeholder="N°" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Date BL</Label>
                                        <Input type="date" value={line.dateBL}
                                            onChange={(e) => onUpdateLine(line.id, "dateBL", e.target.value)}
                                            className="h-8 text-xs" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">N° Facture</Label>
                                        <Input value={line.invoiceNumero}
                                            onChange={(e) => onUpdateLine(line.id, "invoiceNumero", e.target.value)}
                                            className="h-8 text-xs" placeholder="N°" />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Date Facture</Label>
                                        <Input type="date" value={line.dateFact}
                                            onChange={(e) => onUpdateLine(line.id, "dateFact", e.target.value)}
                                            className="h-8 text-xs" />
                                    </div>
                                </div>
                                {lines.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border shadow-sm hover:bg-red-50 hover:text-red-600"
                                        onClick={() => onRemoveLine(line.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
