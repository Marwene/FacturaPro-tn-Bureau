"use client";

import { FileText, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useProductFicheTechnique, useProductFiches } from "@/hooks/use-product-fiche-technique";

export function ProductFichesList({ productId }: { productId: string }) {
    const { deleteFiche } = useProductFicheTechnique(productId);

    const { data, isLoading } = useProductFiches(productId);

    if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>;
    if (!data) return <p className="text-xs text-muted-foreground text-center py-4">Erreur de chargement</p>;

    const allFiches: { id?: string; nom: string; url: string; date?: string }[] = [
        ...(data.legacyFicheUrl ? [{ id: undefined, nom: "Fiche technique", url: data.legacyFicheUrl }] : []),
        ...data.fiches.map((f) => ({ id: f.id, nom: f.nom, url: f.url, date: f.createdAt })),
    ];

    if (allFiches.length === 0) {
        return <p className="text-xs text-muted-foreground text-center py-4">Aucune fiche technique</p>;
    }

    return (
        <div className="space-y-2">
            {allFiches.map((fiche) => (
                <div key={fiche.id ?? "legacy"} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border hover:bg-muted/80 transition-colors group">
                    <FileText className="size-4 text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <a
                            href={fiche.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium hover:underline truncate block"
                        >
                            {fiche.nom}
                        </a>
                        {fiche.date && (
                            <p className="text-[10px] text-muted-foreground">
                                {format(new Date(fiche.date), "dd MMM yyyy", { locale: fr })}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={fiche.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ExternalLink className="size-3" />
                            </Button>
                        </a>
                        {fiche.id && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => deleteFiche.mutate(fiche.id!)}
                                disabled={deleteFiche.isPending}
                            >
                                {deleteFiche.isPending ? <Loader2 className="size-3" /> : <Trash2 className="size-3" />}
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
