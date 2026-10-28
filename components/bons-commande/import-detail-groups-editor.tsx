"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, CheckCircle2 } from "lucide-react";
import type { SerializedBonCommandeLine } from "@/lib/types";
import { totalGroupe, type ArticleGroup, type DetailLine } from "./import-detail-logic";

interface ImportDetailGroupsEditorProps {
    groups: ArticleGroup[];
    lignes: SerializedBonCommandeLine[];
    showUnmatchedWarning: boolean;
    nonRapprochees: number;
    onSetGroupArticle: (groupId: string, bonCommandeLineId: string) => void;
    onRemoveGroup: (groupId: string) => void;
    onAddLineToGroup: (groupId: string) => void;
    onRemoveLineFromGroup: (groupId: string, lineId: string) => void;
    onUpdateLine: (groupId: string, lineId: string, updates: Partial<DetailLine>) => void;
    onAddGroup: () => void;
}

export function ImportDetailGroupsEditor({
    groups,
    lignes,
    showUnmatchedWarning,
    nonRapprochees,
    onSetGroupArticle,
    onRemoveGroup,
    onAddLineToGroup,
    onRemoveLineFromGroup,
    onUpdateLine,
    onAddGroup,
}: ImportDetailGroupsEditorProps) {
    const articleOf = (bonCommandeLineId: string) => lignes.find((l) => l.id === bonCommandeLineId);

    return (
        <div className="py-2 space-y-4">
            {showUnmatchedWarning && (
                <div className="text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
                    {nonRapprochees} ligne(s) extraite(s) n&apos;ont pas pu être associées automatiquement —
                    choisissez l&apos;article correspondant pour chaque groupe signalé ci-dessous.
                </div>
            )}

            <div className="space-y-4">
                {groups.map((g) => {
                    const article = articleOf(g.bonCommandeLineId);
                    const total = totalGroupe(g);
                    const commandee = article ? Number(article.quantite) : null;
                    return (
                        <div key={g.id} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
                                <Select
                                    value={g.bonCommandeLineId}
                                    onValueChange={(v) => onSetGroupArticle(g.id, v)}
                                >
                                    <SelectTrigger size="sm" className="w-64 bg-background">
                                        <SelectValue placeholder="Choisir l'article..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lignes.map((l) => (
                                            <SelectItem key={l.id} value={l.id}>
                                                <span className="flex items-center gap-2">
                                                    {l.description}
                                                    {l.statutRapprochement === "RECONCILIE" && (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                    )}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {commandee !== null && (
                                    <span className={`text-xs ${total === commandee ? "text-emerald-600" : "text-amber-600"}`}>
                                        {total} / {commandee} saisi{total !== commandee ? " (écart)" : ""}
                                    </span>
                                )}
                                {article?.statutRapprochement === "RECONCILIE" && (
                                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">
                                        <CheckCircle2 className="h-3 w-3" /> Déjà réconcilié
                                    </Badge>
                                )}
                                <div className="flex-1" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => onRemoveGroup(g.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-4">Taille</TableHead>
                                        <TableHead>Couleur</TableHead>
                                        <TableHead>Broderie</TableHead>
                                        <TableHead>DTF</TableHead>
                                        <TableHead className="text-right w-24">Quantité</TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {g.lines.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell className="pl-4">
                                                <Input
                                                    className="h-8 w-20"
                                                    value={line.taille}
                                                    onChange={(e) => onUpdateLine(g.id, line.id, { taille: e.target.value })}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    className="h-8 w-24"
                                                    value={line.couleur}
                                                    onChange={(e) => onUpdateLine(g.id, line.id, { couleur: e.target.value })}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    className="h-8 w-24"
                                                    value={line.broderie}
                                                    onChange={(e) => onUpdateLine(g.id, line.id, { broderie: e.target.value })}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    className="h-8 w-24"
                                                    value={line.impressionDtf}
                                                    onChange={(e) => onUpdateLine(g.id, line.id, { impressionDtf: e.target.value })}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-8 w-20 text-right"
                                                    value={line.quantite}
                                                    onChange={(e) => onUpdateLine(g.id, line.id, { quantite: e.target.value })}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => onRemoveLineFromGroup(g.id, line.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="px-3 py-2 bg-muted/20">
                                <Button variant="outline" size="sm" onClick={() => onAddLineToGroup(g.id)}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une ligne pour cet article
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Button variant="outline" size="sm" onClick={onAddGroup}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter un article
            </Button>
        </div>
    );
}
