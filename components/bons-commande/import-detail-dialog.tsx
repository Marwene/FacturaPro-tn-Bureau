"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notify } from "@/lib/notify";
import { Upload, PenLine, Trash2, Loader2, ArrowLeft, ScanLine, Plus, CheckCircle2 } from "lucide-react";
import { useBCRapprochementMutations, type ExtractedDetailLine } from "@/hooks/use-bc-rapprochement";
import type { SerializedBonCommandeLine } from "@/lib/types";

interface DetailLine {
    id: string;
    taille: string;
    couleur: string;
    broderie: string;
    impressionDtf: string;
    quantite: string;
}

interface ArticleGroup {
    id: string;
    bonCommandeLineId: string;
    lines: DetailLine[];
}

type Mode = "choice" | "scan-upload" | "scan-extracting" | "review" | "manual";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bonCommandeId: string;
    lignes: SerializedBonCommandeLine[];
}

const emptyDetailLine = (): DetailLine => ({
    id: crypto.randomUUID(),
    taille: "",
    couleur: "",
    broderie: "",
    impressionDtf: "",
    quantite: "1",
});

const emptyGroup = (bonCommandeLineId = ""): ArticleGroup => ({
    id: crypto.randomUUID(),
    bonCommandeLineId,
    lines: [emptyDetailLine()],
});

// Regroupe les lignes extraites par article : par bonCommandeLineId déjà
// rapproché, sinon par description brute (l'OCR répète la même description
// pour chaque taille/couleur d'un même article non reconnu).
function groupExtractedLines(lines: ExtractedDetailLine[]): ArticleGroup[] {
    const groups = new Map<string, ArticleGroup>();
    for (const l of lines) {
        const key = l.bonCommandeLineId || `desc:${l.description}`;
        let group = groups.get(key);
        if (!group) {
            group = { id: crypto.randomUUID(), bonCommandeLineId: l.bonCommandeLineId ?? "", lines: [] };
            groups.set(key, group);
        }
        group.lines.push({
            id: l.id,
            taille: l.taille ?? "",
            couleur: l.couleur ?? "",
            broderie: l.broderie ?? "",
            impressionDtf: l.impressionDtf ?? "",
            quantite: l.quantite,
        });
    }
    return Array.from(groups.values());
}

export function ImportDetailDialog({ open, onOpenChange, bonCommandeId, lignes }: Props) {
    const [mode, setMode] = useState<Mode>("choice");
    const [dragOver, setDragOver] = useState(false);
    const [groups, setGroups] = useState<ArticleGroup[]>([]);
    const [sourceDocument, setSourceDocument] = useState<string | null>(null);
    const [nonRapprochees, setNonRapprochees] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { extractDetail, saveDetail } = useBCRapprochementMutations(bonCommandeId);

    const reset = () => {
        setMode("choice");
        setGroups([]);
        setSourceDocument(null);
        setNonRapprochees(0);
        setDragOver(false);
    };

    const handleClose = (v: boolean) => {
        if (!v) reset();
        onOpenChange(v);
    };

    const processFile = async (file: File) => {
        setMode("scan-extracting");
        const formData = new FormData();
        formData.append("file", file);
        try {
            const result = await extractDetail.mutateAsync(formData);
            const extracted = result.extracted;
            setSourceDocument(file.name);
            setNonRapprochees(extracted.nonRapprochees);
            setGroups(groupExtractedLines(extracted.lines));
            setMode("review");
        } catch (e) {
            notify.error({
                title: "Extraction du document impossible",
                error: e,
                context: "lors de l'extraction du détail depuis le document importé",
                retry: () => processFile(file),
            });
            setMode("scan-upload");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const startManual = () => {
        setSourceDocument(null);
        setGroups([emptyGroup()]);
        setMode("manual");
    };

    const addGroup = () => setGroups((gs) => [...gs, emptyGroup()]);

    const removeGroup = (groupId: string) => setGroups((gs) => gs.filter((g) => g.id !== groupId));

    const setGroupArticle = (groupId: string, bonCommandeLineId: string) =>
        setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, bonCommandeLineId } : g)));

    const addLineToGroup = (groupId: string) =>
        setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, lines: [...g.lines, emptyDetailLine()] } : g)));

    const removeLineFromGroup = (groupId: string, lineId: string) =>
        setGroups((gs) =>
            gs.map((g) => (g.id === groupId ? { ...g, lines: g.lines.filter((l) => l.id !== lineId) } : g))
        );

    const updateGroupLine = (groupId: string, lineId: string, updates: Partial<DetailLine>) =>
        setGroups((gs) =>
            gs.map((g) =>
                g.id === groupId
                    ? { ...g, lines: g.lines.map((l) => (l.id === lineId ? { ...l, ...updates } : l)) }
                    : g
            )
        );

    const totalGroupe = (g: ArticleGroup) => g.lines.reduce((s, l) => s + (Number(l.quantite) || 0), 0);

    const articleOf = (bonCommandeLineId: string) => lignes.find((l) => l.id === bonCommandeLineId);

    const handleSave = async () => {
        const sansArticle = groups.filter((g) => !g.bonCommandeLineId);
        if (sansArticle.length > 0) {
            notify.warning({
                title: "Article manquant",
                description: "Choisissez l'article pour chaque groupe avant d'enregistrer.",
            });
            return;
        }

        const rows = groups.flatMap((g) =>
            g.lines
                .filter((l) => Number(l.quantite) > 0)
                .map((l) => ({
                    bonCommandeLineId: g.bonCommandeLineId,
                    taille: l.taille || null,
                    couleur: l.couleur || null,
                    broderie: l.broderie || null,
                    impressionDtf: l.impressionDtf || null,
                    quantite: Number(l.quantite),
                }))
        );

        if (rows.length === 0) {
            notify.warning({
                title: "Aucune ligne valide",
                description: "Ajoutez au moins une ligne avec une quantité supérieure à 0.",
            });
            return;
        }

        try {
            await saveDetail.mutateAsync({ sourceDocument, rows });
            notify.success({
                title: "Détail enregistré",
                description: "Le rapprochement des quantités a été recalculé.",
            });
            handleClose(false);
        } catch (e) {
            notify.error({
                title: "Enregistrement du détail impossible",
                error: e,
                context: "lors de l'enregistrement du détail du bon de commande",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importer le détail (taille / couleur / broderie / DTF)</DialogTitle>
                    <DialogDescription>
                        Choisissez l&apos;article une fois par groupe, puis ajoutez autant de lignes de détail que
                        nécessaire pour cet article.
                    </DialogDescription>
                </DialogHeader>

                {mode === "choice" && (
                    <div className="grid gap-4 sm:grid-cols-2 py-4">
                        <button
                            type="button"
                            onClick={() => setMode("scan-upload")}
                            className="border-2 border-dashed rounded-xl p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                        >
                            <ScanLine className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                            <h3 className="font-medium mb-1">Scanner un document</h3>
                            <p className="text-sm text-muted-foreground">PDF ou photo du BC détaillé, extraction automatique</p>
                        </button>
                        <button
                            type="button"
                            onClick={startManual}
                            className="border-2 border-dashed rounded-xl p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                        >
                            <PenLine className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                            <h3 className="font-medium mb-1">Saisie manuelle</h3>
                            <p className="text-sm text-muted-foreground">Ajoutez les articles et leurs lignes de détail</p>
                        </button>
                    </div>
                )}

                {mode === "scan-upload" && (
                    <div className="py-4 space-y-3">
                        <div
                            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                                }`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,image/*"
                                onChange={handleFileInput}
                                className="hidden"
                            />
                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium mb-2">Déposez le BC détaillé ici</h3>
                            <p className="text-sm text-muted-foreground mb-4">ou cliquez pour parcourir</p>
                            <Badge variant="secondary" className="text-xs">PDF, PNG, JPG jusqu&apos;à 20 Mo</Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setMode("choice")}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                        </Button>
                    </div>
                )}

                {mode === "scan-extracting" && (
                    <div className="py-16 text-center space-y-3">
                        <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Extraction du document en cours (OCR)...</p>
                    </div>
                )}

                {(mode === "review" || mode === "manual") && (
                    <div className="py-2 space-y-4">
                        {mode === "review" && nonRapprochees > 0 && (
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
                                                onValueChange={(v) => setGroupArticle(g.id, v)}
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
                                                onClick={() => removeGroup(g.id)}
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
                                                                onChange={(e) => updateGroupLine(g.id, line.id, { taille: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-8 w-24"
                                                                value={line.couleur}
                                                                onChange={(e) => updateGroupLine(g.id, line.id, { couleur: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-8 w-24"
                                                                value={line.broderie}
                                                                onChange={(e) => updateGroupLine(g.id, line.id, { broderie: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-8 w-24"
                                                                value={line.impressionDtf}
                                                                onChange={(e) => updateGroupLine(g.id, line.id, { impressionDtf: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                className="h-8 w-20 text-right"
                                                                value={line.quantite}
                                                                onChange={(e) => updateGroupLine(g.id, line.id, { quantite: e.target.value })}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => removeLineFromGroup(g.id, line.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>

                                        <div className="px-3 py-2 bg-muted/20">
                                            <Button variant="outline" size="sm" onClick={() => addLineToGroup(g.id)}>
                                                <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une ligne pour cet article
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Button variant="outline" size="sm" onClick={addGroup}>
                            <Plus className="h-4 w-4 mr-2" /> Ajouter un article
                        </Button>
                    </div>
                )}

                {(mode === "review" || mode === "manual") && (
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setMode("choice")} disabled={saveDetail.isPending}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                        </Button>
                        <Button onClick={handleSave} disabled={saveDetail.isPending || groups.length === 0}>
                            {saveDetail.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Enregistrer et recalculer le rapprochement
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
