"use client";

import { useState } from "react";
import { useFileUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Camera } from "lucide-react";

import type { VariantFormData } from "./variants-logic";
import { addVariantAttribut, removeVariantAttribut } from "./variants-logic";

interface ProduitVariantEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isNew: boolean;
    data: VariantFormData;
    setData: React.Dispatch<React.SetStateAction<VariantFormData>>;
    onSave: () => void;
}

export function ProduitVariantEditDialog({ open, onOpenChange, isNew, data, setData, onSave }: ProduitVariantEditDialogProps) {
    const [newAttributCle, setNewAttributCle] = useState("");
    const [newAttributValeur, setNewAttributValeur] = useState("");
    const fileUpload = useFileUpload();

    const addAttribut = () => {
        if (!newAttributCle.trim()) return;
        setData((prev) => addVariantAttribut(prev, newAttributCle, newAttributValeur));
        setNewAttributCle("");
        setNewAttributValeur("");
    };

    const removeAttribut = (cle: string) => {
        setData((prev) => removeVariantAttribut(prev, cle));
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subDir", "variants");
        try {
            const result = await fileUpload.mutateAsync(formData);
            if (result?.url) {
                setData((prev) => ({ ...prev, photoUrl: result.url }));
            }
        } catch {
            // L'erreur est déjà notifiée par le hook useFileUpload (lib/notify).
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isNew ? "Nouvelle déclinaison" : "Modifier la déclinaison"}</DialogTitle>
                    <DialogDescription>
                        Définissez les attributs et le stock de cette variante
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="v-nom">Nom</Label>
                        <Input
                            id="v-nom"
                            value={data.nom}
                            onChange={(e) => setData((prev) => ({ ...prev, nom: e.target.value }))}
                            placeholder="Auto-généré depuis les attributs"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Attributs (couleur, taille, etc.)</Label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {Object.entries(data.attributs).map(([cle, valeur]) => (
                                <Badge key={cle} variant="secondary" className="gap-1 text-[10px]">
                                    {cle}: {valeur}
                                    <button onClick={() => removeAttribut(cle)} className="ml-0.5 hover:text-red-500">&times;</button>
                                </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Attribut (ex: Couleur)"
                                value={newAttributCle}
                                onChange={(e) => setNewAttributCle(e.target.value)}
                                className="h-8 text-xs"
                            />
                            <Input
                                placeholder="Valeur (ex: Blanc)"
                                value={newAttributValeur}
                                onChange={(e) => setNewAttributValeur(e.target.value)}
                                className="h-8 text-xs"
                            />
                            <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={addAttribut}>
                                +
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Photo</Label>
                        <div className="flex items-center gap-3">
                            {data.photoUrl ? (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                                    <img src={data.photoUrl} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setData((prev) => ({ ...prev, photoUrl: "" }))}
                                        className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-bl"
                                    >&times;</button>
                                </div>
                            ) : (
                                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                                    <Camera className="size-5 text-muted-foreground/50" />
                                </div>
                            )}
                            <label className="cursor-pointer">
                                <span className="text-xs text-primary hover:underline">{data.photoUrl ? "Changer" : "Télécharger"}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Code (SKU)</Label>
                            <Input
                                value={data.code}
                                onChange={(e) => setData((prev) => ({ ...prev, code: e.target.value }))}
                                placeholder="Optionnel"
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Prix HT</Label>
                            <Input
                                value={data.prixHT}
                                onChange={(e) => setData((prev) => ({ ...prev, prixHT: e.target.value }))}
                                placeholder="Hérité du produit"
                                className="h-8 text-xs"
                                type="number"
                                step="0.001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Actif</Label>
                            <div className="flex items-center h-8">
                                <input
                                    type="checkbox"
                                    checked={data.actif}
                                    onChange={(e) => setData((prev) => ({ ...prev, actif: e.target.checked }))}
                                    className="rounded"
                                />
                                <span className="text-xs ml-2">{data.actif ? "Oui" : "Non"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Stock actuel</Label>
                            <Input
                                value={data.stockActuel}
                                onChange={(e) => setData((prev) => ({ ...prev, stockActuel: e.target.value }))}
                                className="h-8 text-xs"
                                type="number"
                                step="0.001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Stock minimum</Label>
                            <Input
                                value={data.stockMinimum}
                                onChange={(e) => setData((prev) => ({ ...prev, stockMinimum: e.target.value }))}
                                className="h-8 text-xs"
                                type="number"
                                step="0.001"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button size="sm" onClick={onSave}>
                        {isNew ? "Ajouter" : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
