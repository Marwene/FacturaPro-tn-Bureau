"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFileUpload } from "@/hooks/use-upload";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, GripVertical, Trash2, Pencil, Package, Camera } from "lucide-react";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface VariantFormData {
    id?: string;
    nom: string;
    code: string;
    attributs: Record<string, string>;
    prixHT: string;
    stockActuel: string;
    stockMinimum: string;
    photoUrl: string;
    actif: boolean;
    ordre: number;
}

interface ProduitVariantsSectionProps {
    variants: VariantFormData[];
    onChange: (variants: VariantFormData[]) => void;
    readOnly?: boolean;
}

const emptyVariant = (ordre: number): VariantFormData => ({
    nom: "",
    code: "",
    attributs: {},
    prixHT: "",
    stockActuel: "0",
    stockMinimum: "0",
    photoUrl: "",
    actif: true,
    ordre,
});

function generateVariantNom(attributs: Record<string, string>): string {
    return Object.values(attributs).filter(Boolean).join(" / ");
}

function SortableRow({ v, idx, attributsStr, status, openEdit, remove, readOnly }: {
    v: VariantFormData;
    idx: number;
    attributsStr: string;
    status: string;
    openEdit: () => void;
    remove: () => void;
    readOnly?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `variant-${idx}` });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    return (
        <TableRow key={idx} ref={setNodeRef} style={style} className="hover:bg-muted/50">
            <TableCell {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing w-8">
                <GripVertical className="size-3.5 text-muted-foreground/60" />
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    {v.photoUrl ? (
                        <img src={v.photoUrl} alt="" className="w-8 h-8 rounded object-cover border" />
                    ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <Package className="size-3.5 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium">{v.nom || generateVariantNom(v.attributs) || `Déclinaison ${idx + 1}`}</p>
                        {attributsStr && (
                            <p className="text-[10px] text-muted-foreground">{attributsStr}</p>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-xs font-mono text-muted-foreground">{v.code || "—"}</TableCell>
            <TableCell className="text-sm text-right font-medium">{v.prixHT || "—"}</TableCell>
            <TableCell className="tabular-nums text-sm text-right">{v.stockActuel}</TableCell>
            <TableCell className="tabular-nums text-sm text-right">{v.stockMinimum}</TableCell>
            <TableCell>
                <Badge variant="outline" className={`text-[10px] ${
                    status === "RUPTURE" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-0" :
                    status === "CRITIQUE" ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-0" :
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-0"
                }`}>
                    {status === "OK" ? "OK" : status === "CRITIQUE" ? "Critique" : "Rupture"}
                </Badge>
            </TableCell>
            {!readOnly && (
                <TableCell>
                    <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={openEdit}>
                            <Pencil className="size-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={remove}>
                            <Trash2 className="size-3" />
                        </Button>
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
}

export function ProduitVariantsSection({ variants, onChange, readOnly }: ProduitVariantsSectionProps) {
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editData, setEditData] = useState<VariantFormData>(emptyVariant(0));
    const [newAttributCle, setNewAttributCle] = useState("");
    const [newAttributValeur, setNewAttributValeur] = useState("");
    const fileUpload = useFileUpload();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = parseInt(String(active.id).replace("variant-", ""));
        const newIdx = parseInt(String(over.id).replace("variant-", ""));
        const next = [...variants];
        const [moved] = next.splice(oldIdx, 1);
        next.splice(newIdx, 0, moved);
        onChange(next.map((v, i) => ({ ...v, ordre: i })));
    };

    const openAdd = () => {
        setEditData(emptyVariant(variants.length));
        setNewAttributCle("");
        setNewAttributValeur("");
        setEditIndex(-1);
    };

    const openEdit = (idx: number) => {
        setEditData({ ...variants[idx] });
        setNewAttributCle("");
        setNewAttributValeur("");
        setEditIndex(idx);
    };

    const saveEdit = () => {
        const nom = editData.nom || generateVariantNom(editData.attributs) || `Déclinaison ${(editIndex ?? -1) + 1}`;
        const updated = { ...editData, nom };
        if (editIndex === -1) {
            onChange([...variants, updated]);
        } else if (editIndex !== null) {
            const next = [...variants];
            next[editIndex] = updated;
            onChange(next);
        }
        setEditIndex(null);
    };

    const remove = (idx: number) => {
        onChange(variants.filter((_, i) => i !== idx));
    };

    const addAttribut = () => {
        if (!newAttributCle.trim()) return;
        setEditData((prev) => ({
            ...prev,
            attributs: { ...prev.attributs, [newAttributCle.trim()]: newAttributValeur.trim() },
        }));
        setNewAttributCle("");
        setNewAttributValeur("");
    };

    const removeAttribut = (cle: string) => {
        setEditData((prev) => {
            const next = { ...prev.attributs };
            delete next[cle];
            return { ...prev, attributs: next };
        });
    };

    const totalStock = variants.reduce((sum, v) => sum + parseFloat(v.stockActuel || "0"), 0);
    const activeCount = variants.filter((v) => v.actif).length;

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subDir", "variants");
        try {
            const result = await fileUpload.mutateAsync(formData);
            if (result?.url) {
                setEditData((prev) => ({ ...prev, photoUrl: result.url }));
            }
        } catch {
            // L'erreur est déjà notifiée par le hook useFileUpload (lib/notify).
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs text-muted-foreground">
                        {variants.length} déclinaison(s) · {activeCount} active(s) · Stock total : {totalStock}
                    </p>
                </div>
                {!readOnly && (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openAdd}>
                        <Plus className="size-3.5" /> Ajouter
                    </Button>
                )}
            </div>

            {variants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                    Aucune déclinaison. Ajoutez des variantes (couleur, taille, etc.)
                </p>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={variants.map((_, i) => `variant-${i}`)} strategy={verticalListSortingStrategy}>
                        <div className="border rounded-xl overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead>Déclinaison</TableHead>
                                        <TableHead className="w-20">Code</TableHead>
                                        <TableHead className="w-16 text-right">Prix HT</TableHead>
                                        <TableHead className="w-16 text-right">Stock</TableHead>
                                        <TableHead className="w-16 text-right">Min.</TableHead>
                                        <TableHead className="w-16">Statut</TableHead>
                                        {!readOnly && <TableHead className="w-16"></TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variants.map((v, idx) => {
                                        const stock = parseFloat(v.stockActuel || "0");
                                        const min = parseFloat(v.stockMinimum || "0");
                                        const status = stock <= 0 ? "RUPTURE" : stock <= min ? "CRITIQUE" : "OK";
                                        const attributsStr = Object.entries(v.attributs)
                                            .map(([k, val]) => `${k}: ${val}`)
                                            .join(", ");
                                        return (
                                            <SortableRow
                                                key={idx}
                                                v={v}
                                                idx={idx}
                                                attributsStr={attributsStr}
                                                status={status}
                                                openEdit={() => openEdit(idx)}
                                                remove={() => remove(idx)}
                                                readOnly={readOnly}
                                            />
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <Dialog open={editIndex !== null} onOpenChange={(open) => { if (!open) setEditIndex(null); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editIndex === -1 ? "Nouvelle déclinaison" : "Modifier la déclinaison"}</DialogTitle>
                        <DialogDescription>
                            Définissez les attributs et le stock de cette variante
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="v-nom">Nom</Label>
                            <Input
                                id="v-nom"
                                value={editData.nom}
                                onChange={(e) => setEditData((prev) => ({ ...prev, nom: e.target.value }))}
                                placeholder="Auto-généré depuis les attributs"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Attributs (couleur, taille, etc.)</Label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {Object.entries(editData.attributs).map(([cle, valeur]) => (
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
                                {editData.photoUrl ? (
                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                                        <img src={editData.photoUrl} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setEditData((prev) => ({ ...prev, photoUrl: "" }))}
                                            className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-bl"
                                        >&times;</button>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                                        <Camera className="size-5 text-muted-foreground/50" />
                                    </div>
                                )}
                                <label className="cursor-pointer">
                                    <span className="text-xs text-primary hover:underline">{editData.photoUrl ? "Changer" : "Télécharger"}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Code (SKU)</Label>
                                <Input
                                    value={editData.code}
                                    onChange={(e) => setEditData((prev) => ({ ...prev, code: e.target.value }))}
                                    placeholder="Optionnel"
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Prix HT</Label>
                                <Input
                                    value={editData.prixHT}
                                    onChange={(e) => setEditData((prev) => ({ ...prev, prixHT: e.target.value }))}
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
                                        checked={editData.actif}
                                        onChange={(e) => setEditData((prev) => ({ ...prev, actif: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <span className="text-xs ml-2">{editData.actif ? "Oui" : "Non"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Stock actuel</Label>
                                <Input
                                    value={editData.stockActuel}
                                    onChange={(e) => setEditData((prev) => ({ ...prev, stockActuel: e.target.value }))}
                                    className="h-8 text-xs"
                                    type="number"
                                    step="0.001"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Stock minimum</Label>
                                <Input
                                    value={editData.stockMinimum}
                                    onChange={(e) => setEditData((prev) => ({ ...prev, stockMinimum: e.target.value }))}
                                    className="h-8 text-xs"
                                    type="number"
                                    step="0.001"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setEditIndex(null)}>Annuler</Button>
                        <Button size="sm" onClick={saveEdit}>
                            {editIndex === -1 ? "Ajouter" : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
