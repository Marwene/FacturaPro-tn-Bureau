"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCreateStockMovement } from "@/hooks/use-stock-movements";
import { Loader2, PackagePlus } from "lucide-react";

const mouvementTypes = [
    { value: "ENTREE", label: "Entrée", description: "Augmente le stock" },
    { value: "SORTIE", label: "Sortie", description: "Diminue le stock" },
    { value: "AJUSTEMENT", label: "Ajustement", description: "Correction manuelle" },
];

export function AjusterStockDialog({ productId }: { productId: string }) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState("ENTREE");
    const [quantite, setQuantite] = useState("");
    const [notes, setNotes] = useState("");
    const { mutate, isPending } = useCreateStockMovement(productId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseFloat(quantite);
        if (isNaN(qty) || qty <= 0) return;

        mutate(
            { type, quantite: qty, notes: notes || undefined },
            {
                onSuccess: () => {
                    setOpen(false);
                    setQuantite("");
                    setNotes("");
                    setType("ENTREE");
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                    <PackagePlus className="size-3.5" />
                    Ajuster le stock
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Mouvement de stock</DialogTitle>
                        <DialogDescription>
                            Enregistrer une entrée, sortie ou ajustement manuel
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        <RadioGroup value={type} onValueChange={setType} className="grid grid-cols-3 gap-2">
                            {mouvementTypes.map((mt) => (
                                <Label
                                    key={mt.value}
                                    htmlFor={mt.value}
                                    className="flex flex-col items-center gap-1 rounded-xl border-2 p-3 cursor-pointer has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                >
                                    <RadioGroupItem value={mt.value} id={mt.value} className="sr-only" />
                                    <span className="text-sm font-semibold">{mt.label}</span>
                                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{mt.description}</span>
                                </Label>
                            ))}
                        </RadioGroup>

                        <div className="space-y-2">
                            <Label htmlFor="quantite">Quantité</Label>
                            <Input
                                id="quantite"
                                type="number"
                                step="0.001"
                                min="0.001"
                                placeholder="0"
                                value={quantite}
                                onChange={(e) => setQuantite(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optionnel)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Motif du mouvement..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" size="sm" disabled={isPending || !quantite || parseFloat(quantite) <= 0}>
                            {isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                            Valider
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
