"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import {
    AlertTriangle,
    FileUp,
    Trash2,
    Pencil,
    Check,
    X,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { useBCRapprochement, useBCRapprochementMutations } from "@/hooks/use-bc-rapprochement";
import { ImportDetailDialog } from "./import-detail-dialog";
import type { SerializedBonCommandeLigneDetail, SerializedBonCommandeLine } from "@/lib/types";

function EditableQuantite({
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
                {Number(value).toFixed(3)}
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

function DetailRowEdit({
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

function LigneRow({ ligne, bonCommandeId }: { ligne: SerializedBonCommandeLine; bonCommandeId: string }) {
    const [expanded, setExpanded] = useState(false);
    const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
    const { deleteDetailRow, updateLine } = useBCRapprochementMutations(bonCommandeId);
    const details = ligne.details ?? [];

    const ecart = Number(ligne.quantite) - Number(ligne.quantiteDetaillee);

    const handleDelete = async (detailId: string) => {
        try {
            await deleteDetailRow.mutateAsync(detailId);
            notify.success({
                title: "Ligne de détail supprimée",
                description: "Le rapprochement des quantités a été recalculé.",
            });
        } catch (e) {
            notify.error({
                title: "Suppression de la ligne impossible",
                error: e,
                context: "lors de la suppression d'une ligne de détail",
            });
        }
    };

    const handleSaveQuantite = async (n: number) => {
        await updateLine.mutateAsync({ lineId: ligne.id, data: { quantite: n } });
        notify.success({
            title: "Quantité mise à jour",
            description: "Le rapprochement des quantités a été recalculé.",
        });
    };

    return (
        <>
            <TableRow className="cursor-pointer" onClick={() => setExpanded((v) => !v)}>
                <TableCell className="w-6">
                    {details.length > 0 ? (
                        expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    ) : null}
                </TableCell>
                <TableCell>
                    <div className="font-medium">{ligne.description}</div>
                    <div className="text-xs text-muted-foreground">
                        {ligne.typeSource === "PRODUCTION" ? "Production (OF requis)" : "Stock"}
                    </div>
                </TableCell>
                <TableCell className="text-right">
                    <EditableQuantite value={ligne.quantite} onSave={handleSaveQuantite} />
                </TableCell>
                <TableCell className="text-right">{Number(ligne.quantiteDetaillee).toFixed(3)}</TableCell>
                <TableCell className={`text-right font-medium ${ecart !== 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {ecart > 0 ? `+${ecart.toFixed(3)}` : ecart.toFixed(3)}
                </TableCell>
                <TableCell><StatusBadge type="rapprochement" status={ligne.statutRapprochement} /></TableCell>
            </TableRow>
            {expanded &&
                details.map((d) =>
                    editingDetailId === d.id ? (
                        <DetailRowEdit key={d.id} detail={d} bonCommandeId={bonCommandeId} onDone={() => setEditingDetailId(null)} />
                    ) : (
                        <TableRow key={d.id} className="bg-muted/30 text-sm">
                            <TableCell />
                            <TableCell colSpan={3} className="text-muted-foreground">
                                {[d.taille && `Taille: ${d.taille}`, d.couleur && `Couleur: ${d.couleur}`, d.broderie && `Broderie: ${d.broderie}`, d.impressionDtf && `DTF: ${d.impressionDtf}`]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                                {d.sourceDocument && <span className="ml-2 italic">({d.sourceDocument})</span>}
                            </TableCell>
                            <TableCell className="text-right">{Number(d.quantite).toFixed(3)}</TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingDetailId(d.id);
                                        }}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(d.id);
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                )}
        </>
    );
}

export function RapprochementCard({ bonCommandeId, isMixed }: { bonCommandeId: string; isMixed?: boolean }) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { data, isLoading } = useBCRapprochement(bonCommandeId);

    const allLignes = data?.lignes ?? [];
    const lignes = isMixed ? allLignes.filter((l) => l.typeSource === "PRODUCTION") : allLignes;
    const lignesProduction = allLignes.filter((l) => l.typeSource === "PRODUCTION");
    const lignesBloquantes = lignesProduction.filter((l) => l.statutRapprochement !== "RECONCILIE");
    const honorable = lignesBloquantes.length === 0;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle>Rapprochement quantités</CardTitle>
                    <CardDescription>
                        Comparaison entre le bon de commande et son détail (taille / couleur / broderie / DTF) —
                        cliquez sur une quantité pour la modifier
                    </CardDescription>
                </div>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                    <FileUp className="h-4 w-4 mr-2" /> Importer / ajouter du détail
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {!honorable && (
                    <div className="flex items-start gap-2 text-sm bg-destructive/5 border border-destructive/20 text-destructive rounded-lg px-3 py-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                            Ce bon de commande ne peut pas être honoré (OF / bon de livraison / facture) tant que le
                            rapprochement n&apos;est pas soldé pour {lignesBloquantes.length} article(s) de production.
                        </span>
                    </div>
                )}

                {isLoading ? (
                    <Skeleton className="h-40" />
                ) : lignes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune ligne sur ce bon de commande.</p>
                ) : (
                    <div className="border rounded-lg overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-6" />
                                    <TableHead>Article</TableHead>
                                    <TableHead className="text-right">Qté commandée</TableHead>
                                    <TableHead className="text-right">Qté détaillée</TableHead>
                                    <TableHead className="text-right">Écart</TableHead>
                                    <TableHead>Statut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lignes.map((l) => (
                                    <LigneRow key={l.id} ligne={l} bonCommandeId={bonCommandeId} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            <ImportDetailDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                bonCommandeId={bonCommandeId}
                lignes={lignes}
            />
        </Card>
    );
}
