"use client";

import { FileText, ImagePlus, Upload, X } from "lucide-react";
import Image from "next/image";
import { ProduitFormSection } from "./produit-form-section";
import type { ProduitFormFilesController } from "@/hooks/use-produit-form-files";

export function ProduitFormPhotoSection({ files }: { files: ProduitFormFilesController }) {
    const { photoSource, photoInputRef, handlePhotoSelect, handlePhotoRemove } = files;

    return (
        <ProduitFormSection icon={ImagePlus} title="Photo du produit">
            {photoSource ? (
                <div className="relative inline-block group">
                    <Image src={photoSource} alt="Aperçu" width={256} height={256} unoptimized className="w-48 h-48 object-cover rounded-2xl border" />
                    <button
                        type="button"
                        onClick={handlePhotoRemove}
                        className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-48 h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-muted-foreground/50 transition-colors bg-muted/20"
                >
                    <Upload className="size-6 text-muted-foreground/60" />
                    <span className="text-xs text-muted-foreground">Ajouter une photo</span>
                    <span className="text-[10px] text-muted-foreground/60">JPEG, PNG, WebP</span>
                </button>
            )}
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handlePhotoSelect} />
        </ProduitFormSection>
    );
}

export function ProduitFormFichesSection({ files }: { files: ProduitFormFilesController }) {
    const { pendingFiches, ficheInputRef, handleFicheSelect } = files;

    return (
        <ProduitFormSection icon={FileText} title="Fiches techniques (PDF)">
            <div className="flex flex-wrap gap-3 items-start">
                <button
                    type="button"
                    onClick={() => ficheInputRef.current?.click()}
                    className="w-36 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 hover:border-muted-foreground/50 transition-colors bg-muted/20"
                >
                    <Upload className="size-5 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground">Ajouter PDF</span>
                </button>
                {pendingFiches.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 h-9 px-3 rounded-xl bg-muted border text-xs">
                        <FileText className="size-3.5 text-blue-600 shrink-0" />
                        <span className="truncate max-w-[120px]">{f.name}</span>
                    </div>
                ))}
            </div>
            <input ref={ficheInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handleFicheSelect} />
        </ProduitFormSection>
    );
}
