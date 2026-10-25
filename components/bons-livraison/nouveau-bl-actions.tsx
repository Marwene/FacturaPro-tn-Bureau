"use client";

import { useRouter } from "next/navigation";
import { useBLFormStore } from "@/lib/stores/bl-store";
import { useBLMutations } from "@/hooks/use-bl";
import { parseTunisianNumber } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import Link from "next/link";
import { X, Save, FileText } from "lucide-react";

export function NouveauBLActions() {
    const router = useRouter();

    const form = useBLFormStore();
    const { createBL, convertToInvoice } = useBLMutations();

    const buildPayload = (withVise: boolean) => ({
        tiersId: form.tiersId,
        dateCreation: form.dateCreation,
        dateLivraison: form.dateLivraison || null,
        notes: form.notes || null,
        lines: form.lines.map((l) => ({
            productId: l.productId || null,
            description: l.description,
            quantite: parseTunisianNumber(l.quantite) || 1,
            prixHT: parseTunisianNumber(l.prixHT) || 0,
            remise: parseTunisianNumber(l.remise) || 0,
            tauxTVA: withVise ? 0 : parseTunisianNumber(l.tauxTVA) || 19,
            fodec: l.fodec,
            tauxFodec: parseTunisianNumber(l.tauxFodec) || 1,
        })),
        ...(withVise
            ? {
                  blViseActif: form.blViseActif,
                  snNumero: form.snNumero || null,
                  dateSN: form.dateSN || null,
                  poidsBrut: form.poidsBrut ? parseTunisianNumber(form.poidsBrut) : null,
                  poidsNet: form.poidsNet ? parseTunisianNumber(form.poidsNet) : null,
                  nbColis: form.nbColis ? Math.round(parseTunisianNumber(form.nbColis)) : null,
                  devise: form.blViseActif ? form.devise : "TND",
                  tauxChange: form.tauxChange ? parseFloat(form.tauxChange) : null,
                  montantTND: form.montantTND ? parseFloat(form.montantTND) : null,
              }
            : {}),
    });

    const buildInvoicePayload = () => ({
        clientId: form.tiersId,
        dateEmission: new Date().toISOString().split("T")[0],
        dateEcheance: null,
        notes: form.notes ? `${form.notes} (Issu du BL visé)` : "Issu du BL visé sous douane",
        bcViseActif: true,
        bcViseNumero: form.snNumero || null,
        dateSN: form.dateSN || null,
        poids: form.poidsNet ? parseTunisianNumber(form.poidsNet) : null,
        poidsBrut: form.poidsBrut ? parseTunisianNumber(form.poidsBrut) : null,
        nbColis: form.nbColis ? Math.round(parseTunisianNumber(form.nbColis)) : null,
        devise: form.devise,
        tauxChange: form.tauxChange ? parseFloat(form.tauxChange) : null,
        montantTND: form.montantTND ? parseFloat(form.montantTND) : null,
        lines: form.lines.map((l) => ({
            productId: l.productId || null,
            description: l.description,
            quantite: parseTunisianNumber(l.quantite) || 1,
            prixHT: parseTunisianNumber(l.prixHT) || 0,
            remise: parseTunisianNumber(l.remise) || 0,
            tauxTVA: 0,
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
            notify.error({ title: "Ligne requise", error: "Ajoutez au moins une ligne." });
            return false;
        }
        return true;
    };

    const handleSave = () => {
        if (!validate()) return;
        createBL.mutate(buildPayload(form.blViseActif), {
            onSuccess: (data) => {
                notify.success({
                    title: `BL ${data.deliveryNote.numero} enregistré`,
                    description: "Le bon de livraison a été créé.",
                    action: {
                        label: "Voir le document",
                        onClick: () => router.push(`/bons-livraison/${data.deliveryNote.id}`),
                    },
                });
                form.resetForm();
                router.push("/bons-livraison");
            },
            onError: (err) => notify.error({ title: "BL non créé", error: err, context: "création du bon de livraison" }),
        });
    };

    const handleSaveBoth = async () => {
        if (!validate()) return;
        try {
            const result = await createBL.mutateAsync(buildPayload(form.blViseActif));
            const bl = result.deliveryNote;
            if (!bl?.id) throw new Error("BL créé mais ID introuvable pour la conversion");
            await convertToInvoice.mutateAsync(bl);
            notify.success({
                title: "BL et facture créés",
                description: `BL ${bl.numero} et facture créés.`,
                action: {
                    label: "Voir la facture",
                    onClick: () => router.push("/factures"),
                },
            });
            form.resetForm();
            router.push("/factures");
        } catch (err) {
            notify.error({ title: "BL non créé", error: err, context: "création du bon de livraison et conversion en facture" });
        }
    };

    const isPending = createBL.isPending || convertToInvoice.isPending;

    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
                <Link href="/bons-livraison">
                    <X className="h-3.5 w-3.5" />
                    Annuler
                </Link>
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={handleSave}
                disabled={isPending}
            >
                <Save className="h-3.5 w-3.5" />
                {createBL.isPending ? "Création..." : "Créer le BL"}
            </Button>
            {form.blViseActif && (
                <Button
                    size="sm"
                    className="text-xs gap-1 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200"
                    onClick={handleSaveBoth}
                    disabled={isPending}
                >
                    <FileText className="h-3.5 w-3.5" />
                    {isPending ? "Création..." : "Créer BL + Facture"}
                </Button>
            )}
        </div>
    );
}
