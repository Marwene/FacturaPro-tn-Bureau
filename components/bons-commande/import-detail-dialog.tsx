"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { notify } from "@/lib/notify";
import { Loader2, ArrowLeft } from "lucide-react";
import { useBCRapprochementMutations } from "@/hooks/use-bc-rapprochement";
import type { SerializedBonCommandeLine } from "@/lib/types";
import {
    buildDetailRows,
    emptyDetailLine,
    emptyGroup,
    groupExtractedLines,
    type ArticleGroup,
    type DetailLine,
} from "./import-detail-logic";
import { ImportDetailGroupsEditor } from "./import-detail-groups-editor";
import { ImportDetailIntroScreens } from "./import-detail-intro-screens";

type Mode = "choice" | "scan-upload" | "scan-extracting" | "review" | "manual";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bonCommandeId: string;
    lignes: SerializedBonCommandeLine[];
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

    const handleSave = async () => {
        const sansArticle = groups.filter((g) => !g.bonCommandeLineId);
        if (sansArticle.length > 0) {
            notify.warning({
                title: "Article manquant",
                description: "Choisissez l'article pour chaque groupe avant d'enregistrer.",
            });
            return;
        }

        const rows = buildDetailRows(groups);

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

    const introMode = mode === "review" || mode === "manual" ? null : mode;

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

                {introMode && (
                    <ImportDetailIntroScreens
                        mode={introMode}
                        dragOver={dragOver}
                        fileInputRef={fileInputRef}
                        onScan={() => setMode("scan-upload")}
                        onManual={startManual}
                        onBack={() => setMode("choice")}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onFileInput={handleFileInput}
                        onClickUpload={() => fileInputRef.current?.click()}
                    />
                )}

                {(mode === "review" || mode === "manual") && (
                    <>
                        <ImportDetailGroupsEditor
                            groups={groups}
                            lignes={lignes}
                            showUnmatchedWarning={mode === "review" && nonRapprochees > 0}
                            nonRapprochees={nonRapprochees}
                            onSetGroupArticle={setGroupArticle}
                            onRemoveGroup={removeGroup}
                            onAddLineToGroup={addLineToGroup}
                            onRemoveLineFromGroup={removeLineFromGroup}
                            onUpdateLine={updateGroupLine}
                            onAddGroup={addGroup}
                        />
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setMode("choice")} disabled={saveDetail.isPending}>
                                <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                            </Button>
                            <Button onClick={handleSave} disabled={saveDetail.isPending || groups.length === 0}>
                                {saveDetail.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Enregistrer et recalculer le rapprochement
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
