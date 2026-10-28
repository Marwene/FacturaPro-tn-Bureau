"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import {
    AlertTriangle,
    FileUp,
    Trash2,
    Pencil,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { useBCRapprochement, useBCRapprochementMutations } from "@/hooks/use-bc-rapprochement";
import { ImportDetailDialog } from "./import-detail-dialog";
import { DetailRowEdit, EditableQuantite } from "./rapprochement-row-editors";
import {
    computeEcart,
    formatDetailAttributes,
    formatEcart,
    formatQuantite3,
    summarizeRapprochement,
} from "./rapprochement-logic";
import type { SerializedBonCommandeLine } from "@/lib/types";

function LigneRow({ ligne, bonCommandeId }: { ligne: SerializedBonCommandeLine; bonCommandeId: string }) {
    const [expanded, setExpanded] = useState(false);
    const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
    const { deleteDetailRow, updateLine } = useBCRapprochementMutations(bonCommandeId);
    const details = ligne.details ?? [];

    const ecart = computeEcart(ligne);

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
                <TableCell className="text-right">{formatQuantite3(ligne.quantiteDetaillee)}</TableCell>
                <TableCell className={`text-right font-medium ${ecart !== 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {formatEcart(ecart)}
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
                                {formatDetailAttributes(d)}
                                {d.sourceDocument && <span className="ml-2 italic">({d.sourceDocument})</span>}
                            </TableCell>
                            <TableCell className="text-right">{formatQuantite3(d.quantite)}</TableCell>
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

    const { lignes, lignesBloquantes, honorable } = summarizeRapprochement(data?.lignes ?? [], isMixed);

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
