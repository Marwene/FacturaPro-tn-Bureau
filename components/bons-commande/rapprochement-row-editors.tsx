"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { notify } from "@/lib/notify";
import { Check, Pencil, X } from "lucide-react";
import { useBCRapprochementMutations } from "@/hooks/use-bc-rapprochement";
import { formatQuantite3 } from "./rapprochement-logic";
import type { SerializedBonCommandeLigneDetail } from "@/lib/types";

export function EditableQuantite({
    value,
    onSave,
    disabled,
}: {
    value: string;
    onSave: (v: number) => Promise<void>;
    disabled?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);

    if (!editing) {
        return (
            <button
                type="button"
                className="inline-flex items-center gap-1 hover:underline decoration-dotted underline-offset-2 disabled:no-underline disabled:cursor-not-allowed"
                onClick={(e) => {
                    e.stopPropagation();
                    setDraft(value);
                    setEditing(true);
                }}
                disabled={disabled}
                title={disabled ? undefined : "Modifier la quantité"}
            >
                {formatQuantite3(value)}
                {!disabled && <Pencil className="h-3 w-3 text-muted-foreground" />}
            </button>
        );
    }

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const n = Number(draft);
        if (Number.isNaN(n) || n <= 0) {
            notify.warning({
                title: "Quantité invalide",
                description: "Saisissez un nombre supérieur à 0.",
            });
            return;
        }
        setSaving(true);
        try {
            await onSave(n);
            setEditing(false);
        } catch (err) {
            notify.error({
                title: "Mise à jour de la quantité impossible",
                error: err,
                context: "lors de la mise à jour de la quantité d'une ligne",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
                type="number"
                min={0}
                step="0.001"
                autoFocus
                className="h-7 w-24 text-right text-xs"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave} disabled={saving}>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditing(false); }} disabled={saving}>
                <X className="h-3.5 w-3.5" />
            </Button>
        </span>
    );
}

export function DetailRowEdit({
    detail,
    bonCommandeId,
    onDone,
}: {
    detail: SerializedBonCommandeLigneDetail;
    bonCommandeId: string;
    onDone: () => void;
}) {
    const { updateDetailRow } = useBCRapprochementMutations(bonCommandeId);
    const [draft, setDraft] = useState({
        taille: detail.taille ?? "",
        couleur: detail.couleur ?? "",
        broderie: detail.broderie ?? "",
        impressionDtf: detail.impressionDtf ?? "",
        quantite: detail.quantite,
    });

    const handleSave = async () => {
        const qte = Number(draft.quantite);
        if (Number.isNaN(qte) || qte < 0) {
            notify.warning({
                title: "Quantité invalide",
                description: "Saisissez une quantité positive ou nulle.",
            });
            return;
        }
        try {
            await updateDetailRow.mutateAsync({
                detailId: detail.id,
                data: {
                    taille: draft.taille || null,
                    couleur: draft.couleur || null,
                    broderie: draft.broderie || null,
                    impressionDtf: draft.impressionDtf || null,
                    quantite: qte,
                },
            });
            notify.success({
                title: "Détail modifié",
                description: "Le rapprochement des quantités a été recalculé.",
            });
            onDone();
        } catch (e) {
            notify.error({
                title: "Modification du détail impossible",
                error: e,
                context: "lors de la modification d'une ligne de détail",
            });
        }
    };

    return (
        <TableRow className="bg-muted/30 text-sm">
            <TableCell />
            <TableCell>
                <Input className="h-7 w-20 text-xs" placeholder="Taille" value={draft.taille} onChange={(e) => setDraft((d) => ({ ...d, taille: e.target.value }))} />
            </TableCell>
            <TableCell colSpan={2}>
                <div className="flex gap-1.5">
                    <Input className="h-7 w-24 text-xs" placeholder="Couleur" value={draft.couleur} onChange={(e) => setDraft((d) => ({ ...d, couleur: e.target.value }))} />
                    <Input className="h-7 w-24 text-xs" placeholder="Broderie" value={draft.broderie} onChange={(e) => setDraft((d) => ({ ...d, broderie: e.target.value }))} />
                    <Input className="h-7 w-24 text-xs" placeholder="DTF" value={draft.impressionDtf} onChange={(e) => setDraft((d) => ({ ...d, impressionDtf: e.target.value }))} />
                </div>
            </TableCell>
            <TableCell className="text-right">
                <Input type="number" min={0} className="h-7 w-20 text-right text-xs" value={draft.quantite} onChange={(e) => setDraft((d) => ({ ...d, quantite: e.target.value }))} />
            </TableCell>
            <TableCell>
                <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={updateDetailRow.isPending}>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDone} disabled={updateDetailRow.isPending}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
