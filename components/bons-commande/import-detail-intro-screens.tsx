"use client";

import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, PenLine, ArrowLeft, ScanLine, Loader2 } from "lucide-react";

type IntroMode = "choice" | "scan-upload" | "scan-extracting";

interface ImportDetailIntroScreensProps {
    mode: IntroMode;
    dragOver: boolean;
    fileInputRef: RefObject<HTMLInputElement | null>;
    onScan: () => void;
    onManual: () => void;
    onBack: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClickUpload: () => void;
}

export function ImportDetailIntroScreens({
    mode,
    dragOver,
    fileInputRef,
    onScan,
    onManual,
    onBack,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileInput,
    onClickUpload,
}: ImportDetailIntroScreensProps) {
    if (mode === "choice") {
        return (
            <div className="grid gap-4 sm:grid-cols-2 py-4">
                <button
                    type="button"
                    onClick={onScan}
                    className="border-2 border-dashed rounded-xl p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                    <ScanLine className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="font-medium mb-1">Scanner un document</h3>
                    <p className="text-sm text-muted-foreground">PDF ou photo du BC détaillé, extraction automatique</p>
                </button>
                <button
                    type="button"
                    onClick={onManual}
                    className="border-2 border-dashed rounded-xl p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                    <PenLine className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="font-medium mb-1">Saisie manuelle</h3>
                    <p className="text-sm text-muted-foreground">Ajoutez les articles et leurs lignes de détail</p>
                </button>
            </div>
        );
    }

    if (mode === "scan-upload") {
        return (
            <div className="py-4 space-y-3">
                <div
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                        }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={onClickUpload}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/*"
                        onChange={onFileInput}
                        className="hidden"
                    />
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Déposez le BC détaillé ici</h3>
                    <p className="text-sm text-muted-foreground mb-4">ou cliquez pour parcourir</p>
                    <Badge variant="secondary" className="text-xs">PDF, PNG, JPG jusqu&apos;à 20 Mo</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                </Button>
            </div>
        );
    }

    return (
        <div className="py-16 text-center space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extraction du document en cours (OCR)...</p>
        </div>
    );
}
