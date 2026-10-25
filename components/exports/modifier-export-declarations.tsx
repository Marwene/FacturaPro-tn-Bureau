"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

interface ModifierExportDeclarationsProps {
    status: string;
    decVente: string;
    dateDecVente: string;
    simultanee: string;
    dateSimultanee: string;
    notes: string;
    onStatusChange: (v: string) => void;
    onDecVenteChange: (v: string) => void;
    onDateDecVenteChange: (v: string) => void;
    onSimultaneeChange: (v: string) => void;
    onDateSimultaneeChange: (v: string) => void;
    onNotesChange: (v: string) => void;
}

export function ModifierExportDeclarations({
    status, decVente, dateDecVente, simultanee, dateSimultanee, notes,
    onStatusChange, onDecVenteChange, onDateDecVenteChange, onSimultaneeChange, onDateSimultaneeChange, onNotesChange,
}: ModifierExportDeclarationsProps) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Déclarations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Statut</Label>
                        <Select value={status} onValueChange={onStatusChange}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BROUILLON" className="text-xs">Brouillon</SelectItem>
                                <SelectItem value="EN_COURS" className="text-xs">En cours</SelectItem>
                                <SelectItem value="VALIDE" className="text-xs">Validé</SelectItem>
                                <SelectItem value="ANNULE" className="text-xs">Annulé</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">DEC Vente</Label>
                        <Input value={decVente} onChange={(e) => onDecVenteChange(e.target.value)} placeholder="N° déclaration" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date DEC</Label>
                        <Input type="date" value={dateDecVente} onChange={(e) => onDateDecVenteChange(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Simultanée</Label>
                        <Input value={simultanee} onChange={(e) => onSimultaneeChange(e.target.value)} placeholder="N°" className="h-8 text-xs" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date Simultanée</Label>
                        <Input type="date" value={dateSimultanee} onChange={(e) => onDateSimultaneeChange(e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-3 space-y-1">
                        <Label className="text-xs text-muted-foreground">Notes</Label>
                        <Textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} className="h-8 text-xs resize-none" placeholder="Notes optionnelles..." />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
