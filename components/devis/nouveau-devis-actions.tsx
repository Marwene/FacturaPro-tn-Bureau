"use client";

import { useRouter } from "next/navigation";
import { useDevisFormStore } from "@/lib/stores/devis-store";
import { useDevisMutations } from "@/hooks/use-devis";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import Link from "next/link";
import { X, Save, Send } from "lucide-react";

export function NouveauDevisActions() {
    const router = useRouter();

    const form = useDevisFormStore();
    const { createQuote } = useDevisMutations();

    const buildPayload = () => ({
        tiersId: form.tiersId,
        dateCreation: form.dateCreation,
        dateExpiration: form.dateExpiration || null,
        notes: form.notes || null,
        devise: form.devise,
        tauxChange: form.tauxChange || null,
        montantTND: form.montantTND || null,
        lines: form.lines.map((l) => ({
            productId: l.productId || null,
            description: l.description,
            quantite: parseFloat(l.quantite) || 1,
            prixHT: parseFloat(l.prixHT) || 0,
            remise: parseFloat(l.remise) || 0,
            tauxTVA: form.exonereTVA ? 0 : (parseFloat(l.tauxTVA) || 19),
            fodec: form.exonereTVA ? false : l.fodec,
            tauxFodec: parseFloat(l.tauxFodec) || 1,
        })),
    });

    const validate = () => {
        if (!form.tiersId) {
            notify.error({ title: "Client requis", error: "Sélectionnez un client pour continuer." });
            return false;
        }
        if (form.lines.length === 0 || form.lines.every((l) => !l.description)) {
            notify.error({ title: "Ligne requise", error: "Ajoutez au moins une ligne." });
            return false;
        }
        return true;
    };

    const handleSave = () => {
        if (!validate()) return;
        createQuote.mutate(buildPayload(), {
            onSuccess: (data) => {
                notify.success({
                    title: `Devis ${data.quote.numero} enregistré`,
                    description: "Le devis a été créé.",
                    action: {
                        label: "Voir le document",
                        onClick: () => router.push(`/devis/${data.quote.id}`),
                    },
                });
                form.resetForm();
                router.push("/devis");
            },
            onError: (err) => notify.error({ title: "Devis non créé", error: err, context: "création du devis" }),
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
                <Link href="/devis">
                    <X className="h-3.5 w-3.5" />
                    Annuler
                </Link>
            </Button>
            <Button
                size="sm"
                className="text-xs gap-1"
                onClick={handleSave}
                disabled={createQuote.isPending}
            >
                <Save className="h-3.5 w-3.5" />
                {createQuote.isPending ? "Création..." : "Créer le Devis"}
            </Button>
        </div>
    );
}
