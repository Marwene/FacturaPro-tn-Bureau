"use client";

import { useRouter } from "next/navigation";
import { useInvoiceFormStore } from "@/lib/stores/invoices-store";
import { useInvoiceMutations } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import Link from "next/link";
import { parseTunisianNumber } from "@/lib/decimal";
import { X, Save, Send } from "lucide-react";

export function NouvelleFactureActions() {
    const router = useRouter();

    const form = useInvoiceFormStore();
    const { createInvoice } = useInvoiceMutations();

    const buildPayload = (asDraft: boolean) => ({
        tiersId: form.tiersId,
        dateEmission: form.dateEmission,
        dateEcheance: form.dateEcheance || null,
        notes: form.notes || null,
        asDraft,
        bcViseActif: form.bcViseActif,
        bcViseNumero: form.bcViseNumero || null,
        dateSN: form.dateSN || null,
        poids: form.poids ? parseTunisianNumber(form.poids) : null,
        poidsBrut: form.poidsBrut ? parseTunisianNumber(form.poidsBrut) : null,
        nbColis: form.nbColis ? Math.round(parseTunisianNumber(form.nbColis)) : null,
        devise: form.bcViseActif ? form.devise : "TND",
        tauxChange: form.tauxChange ? parseTunisianNumber(form.tauxChange) : null,
        montantTND: form.montantTND ? parseTunisianNumber(form.montantTND) : null,
        lines: form.lines.map((l) => ({
            productId: l.productId || null,
            description: l.description,
            quantite: parseTunisianNumber(l.quantite) || 1,
            prixHT: parseTunisianNumber(l.prixHT) || 0,
            remise: parseTunisianNumber(l.remise) || 0,
            tauxTVA: parseTunisianNumber(l.tauxTVA) || 19,
            fodec: l.fodec,
            tauxFodec: parseTunisianNumber(l.tauxFodec) || 1,
        })),
    });

    const validate = () => {
        if (!form.tiersId) {
            notify.error({ title: "Client requis", error: "Sélectionnez un client pour continuer." });
            return false;
        }
        if (form.lines.length === 0 || form.lines.every((l) => !l.description)) {
            notify.error({ title: "Ligne requise", error: "Ajoutez au moins une ligne de facturation." });
            return false;
        }
        return true;
    };

    const handleDraft = () => {
        if (!validate()) return;
        createInvoice.mutate(buildPayload(true), {
            onSuccess: () => {
                notify.success({ title: "Brouillon sauvegardé" });
                form.resetForm();
                router.push("/factures");
            },
            onError: (err) => notify.error({ title: "Brouillon non enregistré", error: err, context: "enregistrement du brouillon de facture" }),
        });
    };

    const handleSendAndCreate = () => {
        if (!validate()) return;
        createInvoice.mutate(buildPayload(false), {
            onSuccess: () => {
                notify.success({ title: "Facture créée et envoyée" });
                form.resetForm();
                router.push("/factures");
            },
            onError: (err) => notify.error({ title: "Facture non créée", error: err, context: "création de la facture" }),
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
                <Link href="/factures">
                    <X className="h-3.5 w-3.5" />
                    Annuler
                </Link>
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={handleDraft}
                disabled={createInvoice.isPending}
            >
                <Save className="h-3.5 w-3.5" />
                Brouillon
            </Button>
            <Button
                size="sm"
                className="text-xs gap-1"
                onClick={handleSendAndCreate}
                disabled={createInvoice.isPending}
            >
                <Send className="h-3.5 w-3.5" />
                {createInvoice.isPending ? "Création..." : "Créer et Envoyer"}
            </Button>
        </div>
    );
}
