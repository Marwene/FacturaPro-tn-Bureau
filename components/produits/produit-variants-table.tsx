"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { GripVertical, Trash2, Pencil, Package } from "lucide-react";

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

import type { VariantFormData, VariantStockStatus } from "./variants-logic";
import { formatVariantAttributs, reorderVariants, resolveVariantNom, variantStockStatus } from "./variants-logic";

interface ProduitVariantsTableProps {
    variants: VariantFormData[];
    readOnly?: boolean;
    onReorder: (next: VariantFormData[]) => void;
    onEdit: (idx: number) => void;
    onDelete: (idx: number) => void;
}

function SortableRow({ v, idx, attributsStr, status, openEdit, remove, readOnly }: {
    v: VariantFormData;
    idx: number;
    attributsStr: string;
    status: VariantStockStatus;
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
                        <p className="text-sm font-medium">{resolveVariantNom(v.nom, v.attributs, idx + 1)}</p>
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

export function ProduitVariantsTable({ variants, readOnly, onReorder, onEdit, onDelete }: ProduitVariantsTableProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = parseInt(String(active.id).replace("variant-", ""));
        const newIdx = parseInt(String(over.id).replace("variant-", ""));
        onReorder(reorderVariants(variants, oldIdx, newIdx));
    };

    return (
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
                            {variants.map((v, idx) => (
                                <SortableRow
                                    key={idx}
                                    v={v}
                                    idx={idx}
                                    attributsStr={formatVariantAttributs(v.attributs)}
                                    status={variantStockStatus(v.stockActuel, v.stockMinimum)}
                                    openEdit={() => onEdit(idx)}
                                    remove={() => onDelete(idx)}
                                    readOnly={readOnly}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </SortableContext>
        </DndContext>
    );
}
