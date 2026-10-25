"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, X, Loader2, ExternalLink } from "lucide-react";
import { useProductFicheTechnique } from "@/hooks/use-product-fiche-technique";

interface ProductFicheTechniqueProps {
    productId: string;
    ficheTechniqueUrl?: string | null;
}

export function ProductFicheTechnique({ productId, ficheTechniqueUrl }: ProductFicheTechniqueProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { upload, remove } = useProductFicheTechnique(productId);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("fiche", file);
        upload.mutate(formData);
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleDelete = () => remove.mutate();

    const isPending = upload.isPending || remove.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="size-4" />
                    Fiche technique (PDF)
                </CardTitle>
            </CardHeader>
            <CardContent>
                {ficheTechniqueUrl ? (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                            <FileText className="size-5 text-blue-600 shrink-0" />
                            <a
                                href={ficheTechniqueUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline flex items-center gap-1"
                            >
                                Voir la fiche technique
                                <ExternalLink className="size-3" />
                            </a>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDelete} disabled={isPending}>
                            {remove.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                        </Button>
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
                        onClick={() => inputRef.current?.click()}
                    >
                        {isPending ? (
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        ) : (
                            <>
                                <Upload className="size-6 text-muted-foreground mb-1" />
                                <p className="text-xs text-muted-foreground">Uploader un PDF</p>
                                <p className="text-[10px] text-muted-foreground">max 15 Mo</p>
                            </>
                        )}
                    </div>
                )}
                <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
            </CardContent>
        </Card>
    );
}
