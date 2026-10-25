"use client";

import { useRouter } from "next/navigation";
import { useAchatFormStore } from "@/lib/stores/achats-store";
import { useCreateAchat } from "@/hooks/use-achats-queries";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import Link from "next/link";
import { parseTunisianNumber } from "@/lib/decimal";
import { X, Save, Send } from "lucide-react";

export function NouvelAchatActions() {
    const router = useRouter();

    const form = useAchatFormStore();
    const createAchat = useCreateAchat();

    const buildPayload = (asDraft: boolean) => ({
        type: form.type,
        tiersId: form.tiersId,
        createFournisseur: form.createFournisseur,
        dateFacture: form.dateFacture,
        dateEcheance: form.dateEcheance || null,
        referenceFournisseur: form.referenceFournisseur || null,
        timbreFiscal: parseTunisianNumber(form.timbreFiscal) || 0,
        totalHT: form.totalHT ? parseTunisianNumber(form.totalHT) : undefined,
        totalTVA: form.totalTVA ? parseTunisianNumber(form.totalTVA) : undefined,
        totalTTC: form.totalTTC ? parseTunisianNumber(form.totalTTC) : undefined,
        notes: form.notes || null,
        categorieAchat: form.categorieAchat,
        blAchatId: form.blAchatId || null,
        asDraft,
        lines: form.lines.map((l) => ({
            productId: l.productId || null,
            createProduct: l.createProduct,
            description: l.description,
            quantite: parseTunisianNumber(l.quantite) || 1,
            prixAchat: parseTunisianNumber(l.prixAchat) || 0,
            remise: parseTunisianNumber(l.remise) || 0,
            tauxTVA: parseTunisianNumber(l.tauxTVA) || 19,
        })),
    });

    const validate = () => {
        if (!form.tiersId) {
            notify.error({ title: "Fournisseur requis", error: "Sélectionnez un fournisseur pour continuer." });
            return false;
        }
        if (form.lines.length === 0 || form.lines.every((l) => !l.description)) {
            notify.error({ title: "Ligne d'achat requise", error: "Ajoutez au moins une ligne d'achat." });
            return false;
        }
        return true;
    };

    const handleDraft = () => {
        if (!validate()) return;
        createAchat.mutate(buildPayload(true), {
            onSuccess: () => {
                notify.success({ title: "Brouillon sauvegardé" });
                form.resetForm();
                router.push("/achats");
            },
            onError: (err) => notify.error({ title: "Brouillon non enregistré", error: err, context: "enregistrement du brouillon d'achat" }),
        });
    };

    const handleCreate = () => {
        if (!validate()) return;
        createAchat.mutate(buildPayload(false), {
            onSuccess: () => {
                notify.success({ title: "Achat enregistré" });
                form.resetForm();
                router.push("/achats");
            },
            onError: (err) => notify.error({ title: "Achat non créé", error: err, context: "création de l'achat" }),
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
                <Link href="/achats">
                    <X className="h-3.5 w-3.5" />
                    Annuler
                </Link>
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={handleDraft}
                disabled={createAchat.isPending}
            >
                <Save className="h-3.5 w-3.5" />
                Brouillon
            </Button>
            <Button
                size="sm"
                className="text-xs gap-1"
                onClick={handleCreate}
                disabled={createAchat.isPending}
            >
                <Send className="h-3.5 w-3.5" />
                {createAchat.isPending ? "Création..." : "Créer l'Achat"}
            </Button>
        </div>
    );
}
